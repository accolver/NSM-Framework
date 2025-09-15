# Task 2: Core NSM Protocol Implementation

**Priority**: Critical
**Status**: Pending
**Dependencies**: [1]

## Overview
Implement the core Nostr State Machine protocol definitions, event schemas, and TypeScript interfaces for the three proposed event kinds (30079, 7000-7999, 10079).

## Research Context
- **Required Research**: nostr, nips, protocol-design
- **Research Files**:
  - `.taskmaster/docs/research/2025-09-15_ndk-integration.md`
- **Key Findings**:
  - Event kind 30079 for parameterized replaceable NSM definitions
  - Range 7000-7999 for interaction events
  - Kind 10079 for state snapshots
  - NDK provides comprehensive Nostr protocol support

## Implementation Guidance
- **TDD Approach**: Write protocol validation tests first, then implement event schemas and TypeScript definitions
- **Test Criteria**:
  - All event schemas validate correctly
  - TypeScript interfaces provide full type safety
  - Protocol compliance with Nostr specifications
- **Research References**: See @.taskmaster/docs/research/2025-09-15_ndk-integration.md for Nostr integration patterns

## Subtasks

### 2.1 Define NSM Definition Event schema (kind:30079)
**Status**: Pending
**Description**: Create TypeScript interfaces and JSON schemas for NSM Definition Events with all required tags and content structure
**Details**: Define INSMDefinitionEvent interface with mandatory tags (d, name, engine, engineCodeURI) and content schema (initialState, stateSchema, interactionSchema)
**Test Strategy**: Validate schema against example Wordle and Whiteboard definitions

### 2.2 Define NSM Interaction Event schema (kind:7000-7999)
**Status**: Pending
**Description**: Create TypeScript interfaces for interaction events with proper application addressing and content validation
**Details**: Define INSMInteractionEvent interface with a tag addressing, content validation against interactionSchema
**Test Strategy**: Test interaction event validation for different application types

### 2.3 Define NSM State Update Event schema (kind:10079)
**Status**: Pending
**Description**: Create TypeScript interfaces for replaceable state snapshot events with state validation
**Details**: Define INSMStateUpdateEvent interface with proper state content validation against stateSchema
**Test Strategy**: Verify state snapshot validation and replaceability mechanics

### 2.4 Implement protocol validation utilities
**Status**: Pending
**Description**: Create validation functions for all NSM event types with comprehensive error handling and type guards
**Details**: Implement validateNSMDefinition, validateNSMInteraction, validateNSMStateUpdate functions with detailed error messages
**Test Strategy**: Test validation with malformed events, missing fields, and edge cases