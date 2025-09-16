# NSM Python Reference Implementation

A complete Python implementation of the Nostr State Machine (NSM) protocol, providing all the functionality needed to build collaborative applications on Nostr.

## Features

- ✅ **Complete NSM Protocol Support**: All event kinds (30079, 7000-7999, 10079)
- ✅ **Event Validation**: JSON Schema validation against application definitions
- ✅ **Cryptographic Security**: Event signing and verification using secp256k1
- ✅ **Conflict Resolution**: Timestamp-based and owner-based strategies
- ✅ **Relay Communication**: WebSocket-based communication with Nostr relays
- ✅ **Example Applications**: Counter and todo list examples included

## Installation

```bash
pip install -r requirements.txt
```

## Quick Start

### 1. Basic Usage

```python
import asyncio
from nostr.key import PrivateKey
from nsm_protocol import NSMClient, NSMDefinition, NSMInteraction

# Create client
private_key = PrivateKey()
client = NSMClient(private_key, ['wss://relay.damus.io'])

# Define application
definition = NSMDefinition(
    initial_state={'count': 0},
    state_schema={
        'type': 'object',
        'properties': {'count': {'type': 'number'}},
        'required': ['count']
    },
    interaction_schema={
        'type': 'object',
        'properties': {
            'type': {'type': 'string', 'enum': ['INCREMENT', 'DECREMENT']}
        },
        'required': ['type']
    }
)

# Publish definition
async def main():
    await client.publish_definition(
        identifier='my-counter',
        name='My Counter',
        engine='python-nsm',
        definition=definition
    )

asyncio.run(main())
```

### 2. Run Example Applications

```bash
# Interactive counter demo
python example_counter.py

# Todo list example (if available)
python example_todo.py
```

## Core Components

### NSMDefinition
Defines the structure and behavior of an NSM application:
```python
definition = NSMDefinition(
    initial_state={'key': 'value'},
    state_schema={...},        # JSON Schema for state validation
    interaction_schema={...}   # JSON Schema for interaction validation
)
```

### NSMInteraction
Represents user actions that trigger state changes:
```python
interaction = NSMInteraction(
    type='ACTION_TYPE',
    payload={'data': 'value'},
    metadata={'timestamp': 1234567890}
)
```

### NSMStateUpdate
Canonical state snapshots with conflict resolution metadata:
```python
state_update = NSMStateUpdate(
    state={'current': 'state'},
    metadata={
        'stateVersion': 1,
        'lastInteractionId': 'event-id',
        'conflictResolution': 'timestamp-based'
    }
)
```

### NSMClient
High-level client for NSM protocol operations:
```python
client = NSMClient(private_key, relay_urls)

# Publish events
await client.publish_definition(...)
await client.publish_interaction(...)
await client.publish_state_update(...)

# Query events
definition = await client.get_definition(address)
interactions = await client.get_interactions(address)
state_updates = await client.get_state_updates(address)
```

## Event Validation

The implementation includes comprehensive validation:

```python
from nsm_protocol import NSMEventValidator

validator = NSMEventValidator()

# Validate events against schemas
is_valid = validator.validate_definition_event(event, definition)
is_valid = validator.validate_interaction_event(event, definition)
is_valid = validator.validate_state_update_event(event, definition)
```

## Conflict Resolution

Multiple conflict resolution strategies are supported:

```python
from nsm_protocol import NSMConflictResolver

resolver = NSMConflictResolver()

# Timestamp-based resolution (most recent wins)
winner = resolver.timestamp_based_resolution(conflicting_events)

# Owner-based resolution (owner events have precedence)
winner = resolver.owner_based_resolution(conflicting_events, owner_pubkey)
```

## Application Development

### 1. Define Your Application

Create a class that extends the basic NSM functionality:

```python
class MyApplication:
    def __init__(self, client: NSMClient, identifier: str):
        self.client = client
        self.identifier = identifier
        self.address = client.create_address(identifier)
        self.current_state = {}  # Your initial state

    async def initialize(self):
        # Define and publish your application schema
        definition = NSMDefinition(...)
        await self.client.publish_definition(...)

    async def perform_action(self, action_type: str, payload: dict):
        # Create and publish interactions
        interaction = NSMInteraction(type=action_type, payload=payload)
        await self.client.publish_interaction(self.address, interaction)

        # Update local state and publish state update
        self.update_local_state(action_type, payload)
        await self.publish_state_update()
```

### 2. Handle State Management

```python
def update_local_state(self, action_type: str, payload: dict):
    # Implement your application's state transition logic
    if action_type == 'MY_ACTION':
        self.current_state['field'] = payload['value']

async def publish_state_update(self):
    state_update = NSMStateUpdate(
        state=self.current_state.copy(),
        metadata={
            'stateVersion': int(time.time()),
            'conflictResolution': 'timestamp-based'
        }
    )
    await self.client.publish_state_update(self.address, state_update)
```

### 3. Synchronize with Network

```python
async def sync_with_network(self):
    # Get latest state from network
    state_updates = await self.client.get_state_updates(self.address, limit=1)

    if state_updates:
        latest_update = state_updates[0]
        content = json.loads(latest_update.content)
        network_state = content['state']

        # Resolve conflicts if necessary
        if network_state != self.current_state:
            self.current_state = network_state
```

## Testing

The implementation includes comprehensive test coverage. Run tests with:

```bash
python -m pytest tests/
```

## Dependencies

- `python-nostr>=0.9.0` - Core Nostr protocol implementation
- `jsonschema>=4.17.0` - JSON Schema validation
- `websockets>=10.4` - WebSocket communication
- `dataclasses-json>=0.5.7` - JSON serialization for dataclasses

## Security Considerations

- All events are cryptographically signed using secp256k1
- Event content is validated against JSON schemas
- State transitions are deterministic and verifiable
- Conflict resolution strategies prevent state inconsistencies

## Performance

- Async/await pattern for non-blocking operations
- Efficient JSON serialization and deserialization
- Minimal memory footprint for event processing
- Batched relay communication when possible

## Contributing

When contributing to this implementation:

1. Follow Python PEP 8 style guidelines
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure compatibility with the NSM protocol specification

## License

This reference implementation is provided as example code for the NSM protocol specification.