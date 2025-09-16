// Package nsm provides a Go reference implementation of the Nostr State Machine (NSM) protocol
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/nbd-wtf/go-nostr"
	"github.com/nbd-wtf/go-nostr/nip19"
	"github.com/xeipuuv/gojsonschema"
)

// NSM Event Kind Constants
const (
	NSMDefinitionKind      = 30079
	NSMInteractionKindMin  = 7000
	NSMInteractionKindMax  = 7999
	NSMStateUpdateKind     = 10079
)

// NSMDefinition represents an NSM Definition Event (Kind 30079) data structure
type NSMDefinition struct {
	InitialState      map[string]interface{} `json:"initialState"`
	StateSchema       map[string]interface{} `json:"stateSchema"`
	InteractionSchema map[string]interface{} `json:"interactionSchema"`
}

// ToJSON serializes the NSM definition to JSON
func (d *NSMDefinition) ToJSON() (string, error) {
	data, err := json.Marshal(d)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// NSMInteraction represents an NSM Interaction Event (Kind 7000-7999) data structure
type NSMInteraction struct {
	Type     string                 `json:"type"`
	Payload  map[string]interface{} `json:"payload"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ToJSON serializes the NSM interaction to JSON
func (i *NSMInteraction) ToJSON() (string, error) {
	data, err := json.Marshal(i)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// NSMStateUpdate represents an NSM State Update Event (Kind 10079) data structure
type NSMStateUpdate struct {
	State    map[string]interface{} `json:"state"`
	Metadata map[string]interface{} `json:"metadata"`
}

// ToJSON serializes the NSM state update to JSON
func (s *NSMStateUpdate) ToJSON() (string, error) {
	data, err := json.Marshal(s)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// NSMEventValidator provides validation for NSM events
type NSMEventValidator struct{}

// NewNSMEventValidator creates a new NSM event validator
func NewNSMEventValidator() *NSMEventValidator {
	return &NSMEventValidator{}
}

// ValidateDefinitionEvent validates an NSM Definition Event structure and content
func (v *NSMEventValidator) ValidateDefinitionEvent(event *nostr.Event, definition *NSMDefinition) bool {
	// Check event kind
	if event.Kind != NSMDefinitionKind {
		return false
	}

	// Check required tags
	requiredTags := []string{"d", "name", "engine"}
	tagsMap := make(map[string]string)

	for _, tag := range event.Tags {
		if len(tag) >= 2 {
			tagsMap[tag[0]] = tag[1]
		}
	}

	for _, requiredTag := range requiredTags {
		if _, exists := tagsMap[requiredTag]; !exists {
			return false
		}
	}

	// Validate JSON content structure
	var content map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content); err != nil {
		return false
	}

	requiredFields := []string{"initialState", "stateSchema", "interactionSchema"}
	for _, field := range requiredFields {
		if _, exists := content[field]; !exists {
			return false
		}
	}

	// Validate schema structures
	stateSchema, ok := content["stateSchema"].(map[string]interface{})
	if !ok {
		return false
	}

	interactionSchema, ok := content["interactionSchema"].(map[string]interface{})
	if !ok {
		return false
	}

	if stateSchema["type"] != "object" || interactionSchema["type"] != "object" {
		return false
	}

	return true
}

// ValidateInteractionEvent validates an NSM Interaction Event against definition schema
func (v *NSMEventValidator) ValidateInteractionEvent(event *nostr.Event, definition *NSMDefinition) bool {
	// Check event kind range
	if event.Kind < NSMInteractionKindMin || event.Kind > NSMInteractionKindMax {
		return false
	}

	// Check required 'a' tag (address)
	hasAddressTag := false
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "a" {
			hasAddressTag = true
			break
		}
	}

	if !hasAddressTag {
		return false
	}

	// Validate content against interaction schema
	var content map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content); err != nil {
		return false
	}

	// Create JSON schema validator
	schemaLoader := gojsonschema.NewGoLoader(definition.InteractionSchema)
	documentLoader := gojsonschema.NewGoLoader(content)

	result, err := gojsonschema.Validate(schemaLoader, documentLoader)
	if err != nil {
		return false
	}

	return result.Valid()
}

// ValidateStateUpdateEvent validates an NSM State Update Event against definition schema
func (v *NSMEventValidator) ValidateStateUpdateEvent(event *nostr.Event, definition *NSMDefinition) bool {
	// Check event kind
	if event.Kind != NSMStateUpdateKind {
		return false
	}

	// Check required 'a' tag (address)
	hasAddressTag := false
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "a" {
			hasAddressTag = true
			break
		}
	}

	if !hasAddressTag {
		return false
	}

	// Validate content structure
	var content map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content); err != nil {
		return false
	}

	state, hasState := content["state"]
	metadata, hasMetadata := content["metadata"]

	if !hasState || !hasMetadata {
		return false
	}

	// Validate state against state schema
	schemaLoader := gojsonschema.NewGoLoader(definition.StateSchema)
	documentLoader := gojsonschema.NewGoLoader(state)

	result, err := gojsonschema.Validate(schemaLoader, documentLoader)
	if err != nil {
		return false
	}

	return result.Valid()
}

// NSMEventFactory creates NSM events
type NSMEventFactory struct {
	privateKey string
	publicKey  string
}

// NewNSMEventFactory creates a new NSM event factory
func NewNSMEventFactory(privateKey string) (*NSMEventFactory, error) {
	_, pubkey, err := nip19.Decode(privateKey)
	if err != nil {
		return nil, err
	}

	return &NSMEventFactory{
		privateKey: privateKey,
		publicKey:  pubkey.(string),
	}, nil
}

// CreateDefinitionEvent creates an NSM Definition Event
func (f *NSMEventFactory) CreateDefinitionEvent(
	identifier, name, engine string,
	definition *NSMDefinition,
	description, version, engineCodeURI *string,
) (*nostr.Event, error) {
	tags := nostr.Tags{
		{"d", identifier},
		{"name", name},
		{"engine", engine},
	}

	if description != nil {
		tags = append(tags, nostr.Tag{"description", *description})
	}
	if version != nil {
		tags = append(tags, nostr.Tag{"version", *version})
	}
	if engineCodeURI != nil {
		tags = append(tags, nostr.Tag{"engineCodeURI", *engineCodeURI})
	}

	content, err := definition.ToJSON()
	if err != nil {
		return nil, err
	}

	event := &nostr.Event{
		PubKey:    f.publicKey,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Kind:      NSMDefinitionKind,
		Tags:      tags,
		Content:   content,
	}

	// Sign the event
	err = event.Sign(f.privateKey)
	if err != nil {
		return nil, err
	}

	return event, nil
}

// CreateInteractionEvent creates an NSM Interaction Event
func (f *NSMEventFactory) CreateInteractionEvent(
	address string,
	interaction *NSMInteraction,
	participants []string,
) (*nostr.Event, error) {
	tags := nostr.Tags{
		{"a", address},
	}

	for _, participant := range participants {
		tags = append(tags, nostr.Tag{"p", participant})
	}

	// Calculate deterministic kind from address
	kind := f.calculateInteractionKind(address)

	content, err := interaction.ToJSON()
	if err != nil {
		return nil, err
	}

	event := &nostr.Event{
		PubKey:    f.publicKey,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Kind:      kind,
		Tags:      tags,
		Content:   content,
	}

	// Sign the event
	err = event.Sign(f.privateKey)
	if err != nil {
		return nil, err
	}

	return event, nil
}

// CreateStateUpdateEvent creates an NSM State Update Event
func (f *NSMEventFactory) CreateStateUpdateEvent(
	address string,
	stateUpdate *NSMStateUpdate,
	participants []string,
	arbiter *string,
) (*nostr.Event, error) {
	tags := nostr.Tags{
		{"a", address},
	}

	for _, participant := range participants {
		tags = append(tags, nostr.Tag{"p", participant})
	}

	if arbiter != nil {
		tags = append(tags, nostr.Tag{"arbiter", *arbiter})
	}

	content, err := stateUpdate.ToJSON()
	if err != nil {
		return nil, err
	}

	event := &nostr.Event{
		PubKey:    f.publicKey,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Kind:      NSMStateUpdateKind,
		Tags:      tags,
		Content:   content,
	}

	// Sign the event
	err = event.Sign(f.privateKey)
	if err != nil {
		return nil, err
	}

	return event, nil
}

// calculateInteractionKind calculates deterministic kind for interaction events
func (f *NSMEventFactory) calculateInteractionKind(address string) int {
	hash := sha256.Sum256([]byte(address))
	hashInt := uint32(hash[0])<<24 | uint32(hash[1])<<16 | uint32(hash[2])<<8 | uint32(hash[3])
	kind := NSMInteractionKindMin + int(hashInt%(NSMInteractionKindMax-NSMInteractionKindMin+1))
	return kind
}

// CreateAddress creates an NSM address for this factory's applications
func (f *NSMEventFactory) CreateAddress(identifier string) string {
	return fmt.Sprintf("%d:%s:%s", NSMDefinitionKind, f.publicKey, identifier)
}

// NSMConflictResolver handles conflict resolution for NSM events
type NSMConflictResolver struct{}

// NewNSMConflictResolver creates a new NSM conflict resolver
func NewNSMConflictResolver() *NSMConflictResolver {
	return &NSMConflictResolver{}
}

// TimestampBasedResolution resolves conflicts using timestamp-based strategy
func (r *NSMConflictResolver) TimestampBasedResolution(events []*nostr.Event) (*nostr.Event, error) {
	if len(events) == 0 {
		return nil, fmt.Errorf("no events provided for resolution")
	}

	// Sort by created_at descending, then by id ascending
	sort.Slice(events, func(i, j int) bool {
		if events[i].CreatedAt != events[j].CreatedAt {
			return events[i].CreatedAt > events[j].CreatedAt
		}
		return events[i].ID < events[j].ID
	})

	return events[0], nil
}

// OwnerBasedResolution resolves conflicts with owner precedence
func (r *NSMConflictResolver) OwnerBasedResolution(events []*nostr.Event, ownerPubkey string) (*nostr.Event, error) {
	if len(events) == 0 {
		return nil, fmt.Errorf("no events provided for resolution")
	}

	// Separate owner events from others
	var ownerEvents []*nostr.Event
	var otherEvents []*nostr.Event

	for _, event := range events {
		if event.PubKey == ownerPubkey {
			ownerEvents = append(ownerEvents, event)
		} else {
			otherEvents = append(otherEvents, event)
		}
	}

	// If owner has events, use timestamp resolution on them
	if len(ownerEvents) > 0 {
		return r.TimestampBasedResolution(ownerEvents)
	}

	// Otherwise, use timestamp resolution on all events
	return r.TimestampBasedResolution(otherEvents)
}

// NSMClient provides high-level NSM protocol client functionality
type NSMClient struct {
	eventFactory *NSMEventFactory
	validator    *NSMEventValidator
	resolver     *NSMConflictResolver
	relayURLs    []string
	pool         *nostr.SimplePool
}

// NewNSMClient creates a new NSM client
func NewNSMClient(privateKey string, relayURLs []string) (*NSMClient, error) {
	factory, err := NewNSMEventFactory(privateKey)
	if err != nil {
		return nil, err
	}

	pool := nostr.NewSimplePool(context.Background())

	return &NSMClient{
		eventFactory: factory,
		validator:    NewNSMEventValidator(),
		resolver:     NewNSMConflictResolver(),
		relayURLs:    relayURLs,
		pool:         pool,
	}, nil
}

// PublishDefinition publishes an NSM definition to relays
func (c *NSMClient) PublishDefinition(
	identifier, name, engine string,
	definition *NSMDefinition,
	description, version, engineCodeURI *string,
) (*nostr.Event, error) {
	event, err := c.eventFactory.CreateDefinitionEvent(
		identifier, name, engine, definition, description, version, engineCodeURI,
	)
	if err != nil {
		return nil, err
	}

	// Publish to all relays
	for _, url := range c.relayURLs {
		relay, err := c.pool.EnsureRelay(url)
		if err != nil {
			log.Printf("Failed to connect to relay %s: %v", url, err)
			continue
		}

		err = relay.Publish(context.Background(), *event)
		if err != nil {
			log.Printf("Failed to publish to relay %s: %v", url, err)
		}
	}

	return event, nil
}

// PublishInteraction publishes an NSM interaction to relays
func (c *NSMClient) PublishInteraction(
	address string,
	interaction *NSMInteraction,
	participants []string,
) (*nostr.Event, error) {
	event, err := c.eventFactory.CreateInteractionEvent(address, interaction, participants)
	if err != nil {
		return nil, err
	}

	// Publish to all relays
	for _, url := range c.relayURLs {
		relay, err := c.pool.EnsureRelay(url)
		if err != nil {
			log.Printf("Failed to connect to relay %s: %v", url, err)
			continue
		}

		err = relay.Publish(context.Background(), *event)
		if err != nil {
			log.Printf("Failed to publish to relay %s: %v", url, err)
		}
	}

	return event, nil
}

// PublishStateUpdate publishes an NSM state update to relays
func (c *NSMClient) PublishStateUpdate(
	address string,
	stateUpdate *NSMStateUpdate,
	participants []string,
	arbiter *string,
) (*nostr.Event, error) {
	event, err := c.eventFactory.CreateStateUpdateEvent(address, stateUpdate, participants, arbiter)
	if err != nil {
		return nil, err
	}

	// Publish to all relays
	for _, url := range c.relayURLs {
		relay, err := c.pool.EnsureRelay(url)
		if err != nil {
			log.Printf("Failed to connect to relay %s: %v", url, err)
			continue
		}

		err = relay.Publish(context.Background(), *event)
		if err != nil {
			log.Printf("Failed to publish to relay %s: %v", url, err)
		}
	}

	return event, nil
}

// CreateAddress creates an NSM address for this client's applications
func (c *NSMClient) CreateAddress(identifier string) string {
	return c.eventFactory.CreateAddress(identifier)
}

// Helper functions for creating common NSM definitions

// CreateSimpleCounterDefinition creates a simple counter application definition
func CreateSimpleCounterDefinition() *NSMDefinition {
	return &NSMDefinition{
		InitialState: map[string]interface{}{
			"count": 0,
		},
		StateSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"count": map[string]interface{}{
					"type": "number",
				},
			},
			"required": []string{"count"},
		},
		InteractionSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"type": map[string]interface{}{
					"type": "string",
					"enum": []string{"INCREMENT", "DECREMENT"},
				},
			},
			"required": []string{"type"},
		},
	}
}

// CreateTodoDefinition creates a collaborative todo application definition
func CreateTodoDefinition() *NSMDefinition {
	return &NSMDefinition{
		InitialState: map[string]interface{}{
			"todos":  []interface{}{},
			"nextId": 1,
		},
		StateSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"todos": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"id":        map[string]interface{}{"type": "number"},
							"text":      map[string]interface{}{"type": "string"},
							"completed": map[string]interface{}{"type": "boolean"},
						},
						"required": []string{"id", "text", "completed"},
					},
				},
				"nextId": map[string]interface{}{
					"type": "number",
				},
			},
			"required": []string{"todos", "nextId"},
		},
		InteractionSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"type": map[string]interface{}{
					"type": "string",
					"enum": []string{"ADD_TODO", "TOGGLE_TODO", "DELETE_TODO"},
				},
				"payload": map[string]interface{}{
					"type": "object",
				},
			},
			"required": []string{"type"},
		},
	}
}

// Example usage
func main() {
	// Generate a private key for testing
	privateKey := nostr.GeneratePrivateKey()
	privateKeyHex := hex.EncodeToString(privateKey[:])

	fmt.Printf("Generated private key: %s\n", privateKeyHex[:16]+"...")

	// Initialize NSM client
	relayURLs := []string{"wss://relay.damus.io"}
	client, err := NewNSMClient(privateKeyHex, relayURLs)
	if err != nil {
		log.Fatalf("Failed to create NSM client: %v", err)
	}

	// Create and publish a simple counter definition
	counterDef := CreateSimpleCounterDefinition()

	description := "A simple counter application demonstrating NSM protocol"
	version := "1.0.0"

	definitionEvent, err := client.PublishDefinition(
		"simple-counter",
		"Simple Counter",
		"go-nsm",
		counterDef,
		&description,
		&version,
		nil,
	)
	if err != nil {
		log.Fatalf("Failed to publish definition: %v", err)
	}

	fmt.Printf("Published definition: %s\n", definitionEvent.ID)

	// Create application address
	address := client.CreateAddress("simple-counter")
	fmt.Printf("Application address: %s\n", address)

	// Publish an increment interaction
	interaction := &NSMInteraction{
		Type:    "INCREMENT",
		Payload: map[string]interface{}{},
		Metadata: map[string]interface{}{
			"timestamp": time.Now().Unix(),
		},
	}

	interactionEvent, err := client.PublishInteraction(address, interaction, nil)
	if err != nil {
		log.Fatalf("Failed to publish interaction: %v", err)
	}

	fmt.Printf("Published interaction: %s\n", interactionEvent.ID)

	// Publish a state update
	stateUpdate := &NSMStateUpdate{
		State: map[string]interface{}{
			"count": 1,
		},
		Metadata: map[string]interface{}{
			"stateVersion":       1,
			"lastInteractionId":  interactionEvent.ID,
			"conflictResolution": "timestamp-based",
		},
	}

	stateEvent, err := client.PublishStateUpdate(address, stateUpdate, nil, nil)
	if err != nil {
		log.Fatalf("Failed to publish state update: %v", err)
	}

	fmt.Printf("Published state update: %s\n", stateEvent.ID)

	fmt.Println("✅ NSM Go reference implementation demo completed successfully!")
}