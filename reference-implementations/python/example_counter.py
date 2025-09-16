#!/usr/bin/env python3
"""
Simple Counter Example - NSM Python Reference Implementation

This example demonstrates a simple counter application using the NSM protocol.
It shows how to create, publish, and interact with an NSM application.
"""

import asyncio
import time
from nostr.key import PrivateKey
from nsm_protocol import (
    NSMClient,
    NSMDefinition,
    NSMInteraction,
    NSMStateUpdate,
    create_simple_counter_definition
)


class CounterApplication:
    """Simple counter application using NSM protocol"""

    def __init__(self, client: NSMClient, identifier: str = 'simple-counter'):
        self.client = client
        self.identifier = identifier
        self.address = client.create_address(identifier)
        self.current_state = {'count': 0}

    async def initialize(self):
        """Initialize the counter application by publishing its definition"""
        definition = create_simple_counter_definition()

        print(f"Publishing counter definition...")
        event = await self.client.publish_definition(
            identifier=self.identifier,
            name='Simple Counter',
            engine='python-nsm',
            definition=definition,
            description='A simple counter application demonstrating NSM protocol',
            version='1.0.0'
        )

        print(f"✅ Definition published: {event.id}")
        print(f"📍 Application address: {self.address}")

    async def increment(self):
        """Increment the counter by publishing an interaction"""
        interaction = NSMInteraction(
            type='INCREMENT',
            payload={},
            metadata={
                'timestamp': int(time.time()),
                'sessionId': f'session-{int(time.time())}'
            }
        )

        print(f"Publishing INCREMENT interaction...")
        event = await self.client.publish_interaction(self.address, interaction)
        print(f"✅ Interaction published: {event.id}")

        # Update local state
        self.current_state['count'] += 1

        # Publish state update
        await self.publish_state_update(event.id)

    async def decrement(self):
        """Decrement the counter by publishing an interaction"""
        interaction = NSMInteraction(
            type='DECREMENT',
            payload={},
            metadata={
                'timestamp': int(time.time()),
                'sessionId': f'session-{int(time.time())}'
            }
        )

        print(f"Publishing DECREMENT interaction...")
        event = await self.client.publish_interaction(self.address, interaction)
        print(f"✅ Interaction published: {event.id}")

        # Update local state
        self.current_state['count'] -= 1

        # Publish state update
        await self.publish_state_update(event.id)

    async def publish_state_update(self, last_interaction_id: str):
        """Publish the current state to the network"""
        state_update = NSMStateUpdate(
            state=self.current_state.copy(),
            metadata={
                'stateVersion': int(time.time()),
                'lastInteractionId': last_interaction_id,
                'conflictResolution': 'timestamp-based',
                'checksum': self.calculate_state_checksum()
            }
        )

        print(f"Publishing state update (count: {self.current_state['count']})...")
        event = await self.client.publish_state_update(self.address, state_update)
        print(f"✅ State update published: {event.id}")

    def calculate_state_checksum(self) -> str:
        """Calculate a simple checksum for state integrity"""
        import hashlib
        import json
        state_json = json.dumps(self.current_state, sort_keys=True)
        return hashlib.sha256(state_json.encode()).hexdigest()[:16]

    async def get_current_state_from_network(self):
        """Retrieve the latest state from the network"""
        print(f"Fetching latest state from network...")
        state_updates = await self.client.get_state_updates(self.address, limit=1)

        if state_updates:
            latest_update = state_updates[0]
            content = json.loads(latest_update.content)
            network_state = content['state']
            print(f"📊 Network state: {network_state}")
            return network_state
        else:
            print("📊 No state updates found on network")
            return self.current_state

    async def sync_with_network(self):
        """Synchronize local state with network state"""
        network_state = await self.get_current_state_from_network()
        if network_state != self.current_state:
            print(f"🔄 Syncing: Local {self.current_state} → Network {network_state}")
            self.current_state = network_state
        else:
            print("✅ Local state matches network state")

    def display_state(self):
        """Display the current counter state"""
        count = self.current_state['count']
        print(f"\n🔢 Counter Value: {count}")
        print("=" * 30)


async def interactive_demo():
    """Interactive demonstration of the counter application"""
    print("🚀 NSM Python Counter Demo")
    print("=" * 50)

    # Create a private key for this demo
    private_key = PrivateKey()
    print(f"🔑 Generated private key: {private_key.hex()[:16]}...")

    # Initialize NSM client with demo relay
    relay_urls = ['wss://relay.damus.io', 'wss://nos.lol']
    client = NSMClient(private_key, relay_urls)

    # Create counter application
    counter = CounterApplication(client)

    try:
        # Initialize the application
        await counter.initialize()
        counter.display_state()

        print("\n📋 Available commands:")
        print("  + or i  - Increment counter")
        print("  - or d  - Decrement counter")
        print("  s       - Sync with network")
        print("  q       - Quit")
        print()

        while True:
            try:
                command = input("Enter command: ").strip().lower()

                if command in ['+', 'i', 'inc', 'increment']:
                    await counter.increment()
                    counter.display_state()

                elif command in ['-', 'd', 'dec', 'decrement']:
                    await counter.decrement()
                    counter.display_state()

                elif command in ['s', 'sync']:
                    await counter.sync_with_network()
                    counter.display_state()

                elif command in ['q', 'quit', 'exit']:
                    print("👋 Goodbye!")
                    break

                else:
                    print("❌ Unknown command. Try +, -, s, or q")

            except KeyboardInterrupt:
                print("\n\n👋 Demo interrupted. Goodbye!")
                break

            except Exception as e:
                print(f"❌ Error: {e}")

    except Exception as e:
        print(f"❌ Demo failed: {e}")


async def automated_demo():
    """Automated demonstration showing NSM protocol features"""
    print("🤖 NSM Python Automated Demo")
    print("=" * 50)

    # Create a private key
    private_key = PrivateKey()
    print(f"🔑 Using private key: {private_key.hex()[:16]}...")

    # Initialize client
    relay_urls = ['wss://relay.damus.io']
    client = NSMClient(private_key, relay_urls)

    # Create counter application
    counter = CounterApplication(client, 'demo-counter')

    try:
        # Initialize
        await counter.initialize()
        await asyncio.sleep(1)

        # Demonstrate several operations
        operations = [
            ('increment', 5),
            ('decrement', 2),
            ('increment', 3)
        ]

        for operation, count in operations:
            print(f"\n🎬 Performing {count} {operation} operations...")

            for i in range(count):
                if operation == 'increment':
                    await counter.increment()
                else:
                    await counter.decrement()

                await asyncio.sleep(0.5)  # Small delay between operations

            counter.display_state()

        # Final sync check
        print(f"\n🔄 Final sync check...")
        await counter.sync_with_network()
        counter.display_state()

        print(f"\n✅ Demo completed successfully!")
        print(f"📊 Final counter value: {counter.current_state['count']}")

    except Exception as e:
        print(f"❌ Demo failed: {e}")


async def main():
    """Main function - choose demo mode"""
    print("🚀 NSM Python Counter Application")
    print("=" * 50)
    print("Choose demo mode:")
    print("1. Interactive demo")
    print("2. Automated demo")
    print()

    while True:
        try:
            choice = input("Enter choice (1 or 2): ").strip()

            if choice == '1':
                await interactive_demo()
                break
            elif choice == '2':
                await automated_demo()
                break
            else:
                print("❌ Please enter 1 or 2")

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break


if __name__ == "__main__":
    asyncio.run(main())