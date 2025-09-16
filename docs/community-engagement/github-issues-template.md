# GitHub Issues Templates for NIP Feedback Collection

This document provides templates for creating structured GitHub issues to collect community feedback on the NSM protocol NIPs.

## Issue Templates

### 1. Security Review Issue

**Title**: `[SECURITY] Security Review of NSM Protocol (NIP-NSM & NIP-NSMA)`

**Description**:
```markdown
## Security Review Request

We're seeking comprehensive security review of the NSM (Nostr State Machines) protocol specifications. This issue tracks security-related feedback and concerns.

### Scope
- **NIP-NSM**: Core state machine protocol
- **NIP-NSMA**: Application definition standard
- **Reference Implementations**: TypeScript, Python, Go

### Areas for Review
- [ ] Cryptographic event signing and verification
- [ ] State validation and schema enforcement
- [ ] Conflict resolution mechanisms
- [ ] Replay attack prevention
- [ ] State manipulation resistance
- [ ] Relay-level security considerations
- [ ] Client-side validation requirements

### Security Questions
1. **Event Integrity**: Are there any vulnerabilities in the event signing/verification process?
2. **State Consistency**: Can malicious actors manipulate application state?
3. **Denial of Service**: Are there DoS vectors at the relay or application level?
4. **Data Privacy**: Are there privacy leaks in the state synchronization process?
5. **Access Control**: How should applications handle permission systems?

### Submission Format
Please use the following format for security concerns:

**Severity**: [Critical/High/Medium/Low]
**Component**: [Event Signing/State Validation/Conflict Resolution/etc.]
**Issue**: [Brief description]
**Impact**: [Potential consequences]
**Recommendation**: [Suggested mitigation]

### Resources
- [NIP-NSM Draft](link-to-nip)
- [NIP-NSMA Draft](link-to-nip)
- [Reference Implementations](link-to-implementations)
- [Security Considerations Document](link-to-security-doc)

---
*Security issues will be prioritized and addressed immediately. For critical vulnerabilities, please contact [security contact] directly.*
```

### 2. Performance Analysis Issue

**Title**: `[PERFORMANCE] Performance Impact Analysis of NSM Protocol`

**Description**:
```markdown
## Performance Analysis Request

Help us understand the performance implications of the NSM protocol on Nostr infrastructure and applications.

### Performance Areas
- [ ] **Relay Performance**: Additional processing overhead for NSM events
- [ ] **Client Performance**: State synchronization and validation costs
- [ ] **Network Performance**: Bandwidth and message volume impact
- [ ] **Storage Performance**: State storage and retrieval efficiency
- [ ] **Conflict Resolution**: Performance during high-conflict scenarios

### Benchmark Scenarios
1. **High-Volume Applications**: 1000+ users, 100+ events/second
2. **Complex State**: Large state objects (>10KB), complex schemas
3. **Conflict-Heavy**: Multiple concurrent state updates
4. **Mobile Clients**: Resource-constrained environments
5. **Relay Scaling**: Impact on relay throughput and capacity

### Metrics of Interest
- Event processing time (creation, validation, conflict resolution)
- Memory usage patterns
- Network bandwidth requirements
- Storage space overhead
- Battery impact on mobile devices

### Testing Requests
- [ ] Load testing with reference implementations
- [ ] Mobile device performance profiling
- [ ] Relay throughput benchmarking
- [ ] Memory usage analysis
- [ ] Network efficiency measurements

### Submission Format
**Test Scenario**: [Description]
**Metrics**: [Specific measurements]
**Results**: [Performance data]
**Concerns**: [Issues identified]
**Recommendations**: [Optimization suggestions]

### Resources
- [Performance Benchmarks](link-to-benchmarks)
- [Reference Implementations](link-to-implementations)
- [Load Testing Tools](link-to-tools)
```

### 3. Developer Experience Issue

**Title**: `[DX] Developer Experience Feedback for NSM Protocol`

**Description**:
```markdown
## Developer Experience Review

We want to ensure NSM is easy to understand, implement, and integrate. Share your developer experience feedback here.

### Implementation Experience
- [ ] **API Design**: Are the APIs intuitive and well-designed?
- [ ] **Documentation**: Is the documentation clear and complete?
- [ ] **Learning Curve**: How steep is the learning curve?
- [ ] **Integration**: How easy is it to integrate with existing Nostr apps?
- [ ] **Debugging**: Are debugging tools and error messages helpful?
- [ ] **Testing**: Are testing approaches clear and well-supported?

### Specific Feedback Areas
1. **Getting Started**: First impressions and initial setup
2. **Common Tasks**: Creating definitions, handling interactions, managing state
3. **Advanced Features**: Conflict resolution, custom validation, optimization
4. **Error Handling**: Error messages, debugging experience, troubleshooting
5. **Documentation**: Clarity, completeness, examples quality

### Experience Levels
- [ ] **Nostr Newcomer**: New to Nostr protocol
- [ ] **Nostr Developer**: Experienced with Nostr, new to NSM
- [ ] **NSM Early Adopter**: Testing NSM implementations

### Feedback Format
**Area**: [API/Documentation/Integration/etc.]
**Experience**: [Positive/Negative/Neutral]
**Details**: [Specific feedback]
**Suggestions**: [Improvement recommendations]
**Priority**: [High/Medium/Low]

### Questions
1. What was your first impression of the NSM protocol?
2. Which parts were confusing or difficult to understand?
3. What examples or documentation would be most helpful?
4. How does NSM compare to other state management approaches?
5. What would make you more likely to adopt NSM in your projects?

### Resources
- [Getting Started Guide](link-to-guide)
- [API Documentation](link-to-api-docs)
- [Example Applications](link-to-examples)
- [Reference Implementations](link-to-implementations)
```

### 4. Use Case Analysis Issue

**Title**: `[USE CASES] NSM Protocol Use Case Analysis and Validation`

**Description**:
```markdown
## Use Case Analysis

Help us understand how NSM fits real-world application needs and identify missing capabilities.

### Target Application Types
- [ ] **Collaborative Tools**: Shared documents, whiteboards, project management
- [ ] **Gaming**: Turn-based games, shared game state, leaderboards
- [ ] **Social Applications**: Group chats, forums, social features
- [ ] **Financial Apps**: Payment tracking, shared wallets, accounting
- [ ] **IoT/Device Control**: Device state management, automation
- [ ] **Content Management**: Wikis, CMS, knowledge bases

### Use Case Evaluation
For each use case you're familiar with, please evaluate:

**Fit Assessment**: [Excellent/Good/Fair/Poor]
**Key Requirements**: [Essential features needed]
**Current Gaps**: [Missing capabilities]
**Implementation Complexity**: [Simple/Moderate/Complex]
**Value Proposition**: [Why NSM vs alternatives]

### Specific Questions
1. **Your Application**: What are you building or planning to build?
2. **State Requirements**: What kind of state do you need to manage?
3. **Collaboration Needs**: How do multiple users interact with the state?
4. **Conflict Scenarios**: When do conflicts occur and how should they be resolved?
5. **Performance Needs**: What are your performance requirements?
6. **Integration Constraints**: What technical constraints do you have?

### New Use Cases
If you have use cases not listed above, please describe:
- Application type and purpose
- State management requirements
- User interaction patterns
- Scalability needs
- Special considerations

### Anti-Patterns
Help us identify what NSM should NOT be used for:
- Use cases where NSM adds unnecessary complexity
- Scenarios where simpler approaches are better
- Applications with conflicting requirements

### Resources
- [Use Case Examples](link-to-examples)
- [Application Templates](link-to-templates)
- [Implementation Patterns](link-to-patterns)
```

### 5. Technical Design Issue

**Title**: `[DESIGN] Technical Design Discussion for NSM Protocol`

**Description**:
```markdown
## Technical Design Review

Discuss the technical design decisions in the NSM protocol and suggest improvements.

### Design Areas
- [ ] **Event Schema**: Structure and validation of NSM events
- [ ] **State Management**: How application state is defined and updated
- [ ] **Conflict Resolution**: Mechanisms for resolving concurrent updates
- [ ] **Addressing**: How applications and states are addressed
- [ ] **Versioning**: Protocol and application version management
- [ ] **Extensibility**: Future enhancement mechanisms

### Key Design Questions
1. **Event Kinds**: Are the chosen event kinds (30079, 7000-7999, 10079) appropriate?
2. **State Schema**: Is JSON Schema the right choice for state validation?
3. **Conflict Resolution**: Are timestamp-based and owner-based resolution sufficient?
4. **Determinism**: How do we ensure deterministic behavior across implementations?
5. **Backwards Compatibility**: How do we handle protocol evolution?

### Design Principles
Current principles guiding NSM design:
- **Simplicity**: Keep the protocol simple and focused
- **Compatibility**: Work with existing Nostr infrastructure
- **Determinism**: Ensure predictable behavior across implementations
- **Flexibility**: Support diverse application needs
- **Performance**: Minimize overhead and optimize for common cases

### Alternative Approaches
If you disagree with current design decisions, please suggest alternatives:
- **Problem**: [What issue you see with current design]
- **Alternative**: [Your suggested approach]
- **Trade-offs**: [Advantages and disadvantages]
- **Migration**: [How to transition from current design]

### Implementation Concerns
- **Complexity**: Are there overly complex parts that could be simplified?
- **Edge Cases**: Are there unhandled edge cases or corner scenarios?
- **Error Handling**: Are error conditions properly defined and handled?
- **Testing**: Are the specifications testable and verifiable?

### Future Considerations
- What features might be needed in future versions?
- How should the protocol evolve while maintaining compatibility?
- What extension points should be built in now?

### Resources
- [Design Rationale Document](link-to-design-doc)
- [Protocol Specification](link-to-spec)
- [Implementation Comparison](link-to-comparison)
```

## GitHub Issues Creation Commands

### Create Security Review Issue
```bash
gh issue create \
  --title "[SECURITY] Security Review of NSM Protocol (NIP-NSM & NIP-NSMA)" \
  --body-file security-review-template.md \
  --label "security,feedback,nip-nsm,nip-nsma" \
  --assignee "@me"
```

### Create Performance Analysis Issue
```bash
gh issue create \
  --title "[PERFORMANCE] Performance Impact Analysis of NSM Protocol" \
  --body-file performance-analysis-template.md \
  --label "performance,feedback,analysis" \
  --assignee "@me"
```

### Create Developer Experience Issue
```bash
gh issue create \
  --title "[DX] Developer Experience Feedback for NSM Protocol" \
  --body-file developer-experience-template.md \
  --label "developer-experience,feedback,documentation" \
  --assignee "@me"
```

### Create Use Case Analysis Issue
```bash
gh issue create \
  --title "[USE CASES] NSM Protocol Use Case Analysis and Validation" \
  --body-file use-case-analysis-template.md \
  --label "use-cases,feedback,validation" \
  --assignee "@me"
```

### Create Technical Design Issue
```bash
gh issue create \
  --title "[DESIGN] Technical Design Discussion for NSM Protocol" \
  --body-file technical-design-template.md \
  --label "design,feedback,technical" \
  --assignee "@me"
```

## Labels to Create

```bash
# Create feedback-related labels
gh label create "feedback" --description "Community feedback requests" --color "0075ca"
gh label create "security" --description "Security-related discussions" --color "d73a49"
gh label create "performance" --description "Performance analysis and optimization" --color "fbca04"
gh label create "developer-experience" --description "Developer experience improvements" --color "7057ff"
gh label create "use-cases" --description "Use case analysis and validation" --color "008672"
gh label create "design" --description "Technical design discussions" --color "e99695"
gh label create "nip-nsm" --description "Related to NIP-NSM specification" --color "0e8a16"
gh label create "nip-nsma" --description "Related to NIP-NSMA specification" --color "0e8a16"
```

## Issue Management

### Monitoring and Response
- Check all feedback issues daily
- Respond to new comments within 24 hours for critical items
- Weekly triage meetings to review and categorize feedback
- Monthly summary reports on feedback trends

### Escalation Process
- Critical security issues: Immediate response (within 4 hours)
- High-priority feedback: Response within 24 hours
- Medium-priority feedback: Response within 72 hours
- Low-priority feedback: Weekly batch response

### Feedback Integration
- Weekly review of all feedback
- Bi-weekly integration planning sessions
- Monthly protocol iteration based on feedback
- Quarterly comprehensive review and roadmap update

---

*This template system provides structured feedback collection while maintaining flexibility for different types of community input.*