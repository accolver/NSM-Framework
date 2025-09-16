"""
NSM Protocol Python Reference Implementation

This module provides a complete implementation of the Nostr State Machine (NSM) protocol
as specified in NIP-NSM. It includes event creation, validation, and processing functionality.
"""

import json
import time
import hashlib
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from jsonschema import validate, ValidationError
import asyncio
import websockets
from nostr.event import Event
from nostr.key import PrivateKey
from nostr.relay_manager import RelayManager
from nostr.client.client import Client
from nostr.filter import Filter, Filters


# NSM Event Kind Constants
NSM_DEFINITION_KIND = 30079
NSM_INTERACTION_KIND_START = 7000
NSM_INTERACTION_KIND_END = 7999
NSM_STATE_UPDATE_KIND = 10079


@dataclass
class NSMDefinition:
    """NSM Definition Event (Kind 30079) data structure"""
    initial_state: Dict[str, Any]
    state_schema: Dict[str, Any]
    interaction_schema: Dict[str, Any]

    def to_json(self) -> str:
        return json.dumps(asdict(self), separators=(',', ':'))


@dataclass
class NSMInteraction:
    """NSM Interaction Event (Kind 7000-7999) data structure"""
    type: str
    payload: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), separators=(',', ':'))


@dataclass
class NSMStateUpdate:
    """NSM State Update Event (Kind 10079) data structure"""
    state: Dict[str, Any]
    metadata: Dict[str, Any]

    def to_json(self) -> str:
        return json.dumps(asdict(self), separators=(',', ':'))


class NSMEventValidator:
    """Validates NSM events according to protocol specifications"""

    @staticmethod
    def validate_definition_event(event: Event, definition: NSMDefinition) -> bool:
        """Validate NSM Definition Event structure and content"""
        try:
            # Check event kind
            if event.kind != NSM_DEFINITION_KIND:
                return False

            # Check required tags
            required_tags = ['d', 'name', 'engine']
            tags_dict = {tag[0]: tag[1] for tag in event.tags if len(tag) >= 2}

            for required_tag in required_tags:
                if required_tag not in tags_dict:
                    return False

            # Validate JSON content structure
            content = json.loads(event.content)
            required_fields = ['initialState', 'stateSchema', 'interactionSchema']

            for field in required_fields:
                if field not in content:
                    return False

            # Validate schema structures
            state_schema = content['stateSchema']
            interaction_schema = content['interactionSchema']

            if state_schema.get('type') != 'object':
                return False

            if interaction_schema.get('type') != 'object':
                return False

            return True

        except (json.JSONDecodeError, KeyError, ValidationError):
            return False

    @staticmethod
    def validate_interaction_event(event: Event, definition: NSMDefinition) -> bool:
        """Validate NSM Interaction Event against definition schema"""
        try:
            # Check event kind range
            if not (NSM_INTERACTION_KIND_START <= event.kind <= NSM_INTERACTION_KIND_END):
                return False

            # Check required 'a' tag (address)
            address_tags = [tag[1] for tag in event.tags if tag[0] == 'a']
            if not address_tags:
                return False

            # Validate content against interaction schema
            content = json.loads(event.content)
            validate(content, definition.interaction_schema)

            return True

        except (json.JSONDecodeError, ValidationError):
            return False

    @staticmethod
    def validate_state_update_event(event: Event, definition: NSMDefinition) -> bool:
        """Validate NSM State Update Event against definition schema"""
        try:
            # Check event kind
            if event.kind != NSM_STATE_UPDATE_KIND:
                return False

            # Check required 'a' tag (address)
            address_tags = [tag[1] for tag in event.tags if tag[0] == 'a']
            if not address_tags:
                return False

            # Validate content structure
            content = json.loads(event.content)
            if 'state' not in content or 'metadata' not in content:
                return False

            # Validate state against state schema
            validate(content['state'], definition.state_schema)

            return True

        except (json.JSONDecodeError, ValidationError):
            return False


class NSMEventFactory:
    """Factory for creating NSM events"""

    def __init__(self, private_key: PrivateKey):
        self.private_key = private_key
        self.public_key = private_key.public_key

    def create_definition_event(
        self,
        identifier: str,
        name: str,
        engine: str,
        definition: NSMDefinition,
        description: Optional[str] = None,
        version: Optional[str] = None,
        engine_code_uri: Optional[str] = None
    ) -> Event:
        """Create an NSM Definition Event"""
        tags = [
            ['d', identifier],
            ['name', name],
            ['engine', engine]
        ]

        if description:
            tags.append(['description', description])
        if version:
            tags.append(['version', version])
        if engine_code_uri:
            tags.append(['engineCodeURI', engine_code_uri])

        event = Event(
            content=definition.to_json(),
            public_key=self.public_key.hex(),
            created_at=int(time.time()),
            kind=NSM_DEFINITION_KIND,
            tags=tags
        )

        event.sign(self.private_key.hex())
        return event

    def create_interaction_event(
        self,
        address: str,
        interaction: NSMInteraction,
        participants: Optional[List[str]] = None
    ) -> Event:
        """Create an NSM Interaction Event"""
        tags = [['a', address]]

        if participants:
            for participant in participants:
                tags.append(['p', participant])

        # Calculate deterministic kind from address
        kind = self._calculate_interaction_kind(address)

        event = Event(
            content=interaction.to_json(),
            public_key=self.public_key.hex(),
            created_at=int(time.time()),
            kind=kind,
            tags=tags
        )

        event.sign(self.private_key.hex())
        return event

    def create_state_update_event(
        self,
        address: str,
        state_update: NSMStateUpdate,
        participants: Optional[List[str]] = None,
        arbiter: Optional[str] = None
    ) -> Event:
        """Create an NSM State Update Event"""
        tags = [['a', address]]

        if participants:
            for participant in participants:
                tags.append(['p', participant])

        if arbiter:
            tags.append(['arbiter', arbiter])

        event = Event(
            content=state_update.to_json(),
            public_key=self.public_key.hex(),
            created_at=int(time.time()),
            kind=NSM_STATE_UPDATE_KIND,
            tags=tags
        )

        event.sign(self.private_key.hex())
        return event

    def _calculate_interaction_kind(self, address: str) -> int:
        """Calculate deterministic kind for interaction events"""
        hash_bytes = hashlib.sha256(address.encode()).digest()
        hash_int = int.from_bytes(hash_bytes[:4], byteorder='big')
        kind = NSM_INTERACTION_KIND_START + (hash_int % (NSM_INTERACTION_KIND_END - NSM_INTERACTION_KIND_START + 1))
        return kind


class NSMConflictResolver:
    """Handles conflict resolution for NSM events"""

    @staticmethod
    def timestamp_based_resolution(events: List[Event]) -> Event:
        """Resolve conflicts using timestamp-based strategy"""
        if not events:
            raise ValueError("No events provided for resolution")

        # Sort by created_at descending, then by id ascending
        sorted_events = sorted(
            events,
            key=lambda e: (-e.created_at, e.id)
        )

        return sorted_events[0]

    @staticmethod
    def owner_based_resolution(events: List[Event], owner_pubkey: str) -> Event:
        """Resolve conflicts with owner precedence"""
        if not events:
            raise ValueError("No events provided for resolution")

        # Separate owner events from others
        owner_events = [e for e in events if e.public_key == owner_pubkey]
        other_events = [e for e in events if e.public_key != owner_pubkey]

        # If owner has events, use timestamp resolution on them
        if owner_events:
            return NSMConflictResolver.timestamp_based_resolution(owner_events)

        # Otherwise, use timestamp resolution on all events
        return NSMConflictResolver.timestamp_based_resolution(other_events)


class NSMClient:
    """High-level NSM protocol client"""

    def __init__(self, private_key: PrivateKey, relay_urls: List[str]):
        self.private_key = private_key
        self.event_factory = NSMEventFactory(private_key)
        self.validator = NSMEventValidator()
        self.resolver = NSMConflictResolver()

        # Initialize Nostr client
        self.client = Client()
        for url in relay_urls:
            self.client.add_relay(url)

    async def publish_definition(
        self,
        identifier: str,
        name: str,
        engine: str,
        definition: NSMDefinition,
        **kwargs
    ) -> Event:
        """Publish an NSM definition to relays"""
        event = self.event_factory.create_definition_event(
            identifier, name, engine, definition, **kwargs
        )

        await self.client.publish_event(event)
        return event

    async def publish_interaction(
        self,
        address: str,
        interaction: NSMInteraction,
        participants: Optional[List[str]] = None
    ) -> Event:
        """Publish an NSM interaction to relays"""
        event = self.event_factory.create_interaction_event(
            address, interaction, participants
        )

        await self.client.publish_event(event)
        return event

    async def publish_state_update(
        self,
        address: str,
        state_update: NSMStateUpdate,
        participants: Optional[List[str]] = None,
        arbiter: Optional[str] = None
    ) -> Event:
        """Publish an NSM state update to relays"""
        event = self.event_factory.create_state_update_event(
            address, state_update, participants, arbiter
        )

        await self.client.publish_event(event)
        return event

    async def get_definition(self, address: str) -> Optional[Event]:
        """Retrieve an NSM definition by address"""
        # Parse address to extract pubkey and identifier
        parts = address.split(':')
        if len(parts) != 3 or parts[0] != str(NSM_DEFINITION_KIND):
            raise ValueError("Invalid address format")

        pubkey, identifier = parts[1], parts[2]

        filter = Filter(
            kinds=[NSM_DEFINITION_KIND],
            authors=[pubkey],
            tags={'d': [identifier]}
        )

        events = await self.client.get_events([filter])
        return events[0] if events else None

    async def get_interactions(
        self,
        address: str,
        since: Optional[int] = None,
        until: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[Event]:
        """Retrieve NSM interactions for an application"""
        filter = Filter(
            kinds=list(range(NSM_INTERACTION_KIND_START, NSM_INTERACTION_KIND_END + 1)),
            tags={'a': [address]},
            since=since,
            until=until,
            limit=limit
        )

        return await self.client.get_events([filter])

    async def get_state_updates(
        self,
        address: str,
        since: Optional[int] = None,
        until: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[Event]:
        """Retrieve NSM state updates for an application"""
        filter = Filter(
            kinds=[NSM_STATE_UPDATE_KIND],
            tags={'a': [address]},
            since=since,
            until=until,
            limit=limit
        )

        return await self.client.get_events([filter])

    def create_address(self, identifier: str) -> str:
        """Create an NSM address for this client's applications"""
        return f"{NSM_DEFINITION_KIND}:{self.private_key.public_key.hex()}:{identifier}"


# Example usage and helper functions
def create_simple_counter_definition() -> NSMDefinition:
    """Create a simple counter application definition"""
    return NSMDefinition(
        initial_state={'count': 0},
        state_schema={
            'type': 'object',
            'properties': {
                'count': {'type': 'number'}
            },
            'required': ['count']
        },
        interaction_schema={
            'type': 'object',
            'properties': {
                'type': {
                    'type': 'string',
                    'enum': ['INCREMENT', 'DECREMENT']
                }
            },
            'required': ['type']
        }
    )


def create_todo_definition() -> NSMDefinition:
    """Create a collaborative todo application definition"""
    return NSMDefinition(
        initial_state={'todos': [], 'nextId': 1},
        state_schema={
            'type': 'object',
            'properties': {
                'todos': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'number'},
                            'text': {'type': 'string'},
                            'completed': {'type': 'boolean'}
                        },
                        'required': ['id', 'text', 'completed']
                    }
                },
                'nextId': {'type': 'number'}
            },
            'required': ['todos', 'nextId']
        },
        interaction_schema={
            'type': 'object',
            'properties': {
                'type': {
                    'type': 'string',
                    'enum': ['ADD_TODO', 'TOGGLE_TODO', 'DELETE_TODO']
                },
                'payload': {'type': 'object'}
            },
            'required': ['type']
        }
    )


if __name__ == "__main__":
    # Example usage
    async def main():
        # Create a private key for testing
        private_key = PrivateKey()

        # Initialize NSM client
        client = NSMClient(private_key, ['wss://relay.damus.io'])

        # Create and publish a simple counter definition
        counter_def = create_simple_counter_definition()

        definition_event = await client.publish_definition(
            identifier='simple-counter',
            name='Simple Counter',
            engine='python-nsm',
            definition=counter_def,
            description='A simple counter application'
        )

        print(f"Published definition: {definition_event.id}")

        # Create application address
        address = client.create_address('simple-counter')

        # Publish an increment interaction
        interaction = NSMInteraction(
            type='INCREMENT',
            payload={},
            metadata={'timestamp': int(time.time())}
        )

        interaction_event = await client.publish_interaction(address, interaction)
        print(f"Published interaction: {interaction_event.id}")

        # Publish a state update
        state_update = NSMStateUpdate(
            state={'count': 1},
            metadata={
                'stateVersion': 1,
                'lastInteractionId': interaction_event.id,
                'conflictResolution': 'timestamp-based'
            }
        )

        state_event = await client.publish_state_update(address, state_update)
        print(f"Published state update: {state_event.id}")

    # Run the example
    asyncio.run(main())