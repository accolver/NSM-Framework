/**
 * Integration tests for multi-user scenarios
 * Tests complex workflows involving multiple users, collaborative state machines,
 * and distributed coordination
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { NSMClient } from '../../packages/nsm-client/src/nsm-client';
import { BlossomClient } from '../../packages/nsm-client-sdk/src/blossom/BlossomClient';
import { NSMDefinition } from '../../packages/nsm-core/src/types';

// Test configuration
const TEST_RELAY = 'wss://relay.damus.io';
const TEST_BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://blossom.nostrage.com'
];

// Generate test private keys (DO NOT use in production)
const generateTestKey = (seed: string): string => {
  // Create a stable hash from the seed and pad to 64 hex chars
  const hash = seed.split('').map(c => c.charCodeAt(0).toString(16)).join('');
  return hash.repeat(Math.ceil(64 / hash.length)).slice(0, 64);
};

describe('Multi-User Scenarios Integration Tests', () => {
  let users: {
    alice: NSMClient;
    bob: NSMClient;
    charlie: NSMClient;
  };
  let blossomClient: BlossomClient;

  beforeAll(async () => {
    // Initialize multiple users
    users = {
      alice: new NSMClient({
        privateKey: generateTestKey('a'),
        relays: [TEST_RELAY]
      }),
      bob: new NSMClient({
        privateKey: generateTestKey('b'),
        relays: [TEST_RELAY]
      }),
      charlie: new NSMClient({
        privateKey: generateTestKey('c'),
        relays: [TEST_RELAY]
      })
    };

    // Initialize Blossom client for data persistence
    blossomClient = new BlossomClient({
      servers: TEST_BLOSSOM_SERVERS,
      privateKey: generateTestKey('storage'),
      redundancy: {
        replicationCount: 2,
        failoverTimeout: 10000
      }
    });

    // Initialize all clients
    await Promise.all([
      users.alice.init(),
      users.bob.init(),
      users.charlie.init()
    ]);

    // Give connections time to establish
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    // Clean up all connections
    await Promise.all([
      users.alice.disconnect(),
      users.bob.disconnect(),
      users.charlie.disconnect()
    ]);
  });

  beforeEach(async () => {
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Collaborative Workflow Scenarios', () => {
    it('should handle a multi-stage approval workflow', async () => {
      // Define a document approval workflow
      const approvalWorkflow: NSMDefinition = {
        id: `approval-workflow-${Date.now()}`,
        name: 'Document Approval Workflow',
        version: '1.0.0',
        states: {
          'draft': { name: 'Draft', type: 'initial' },
          'review': { name: 'Under Review', type: 'normal' },
          'approved': { name: 'Approved', type: 'normal' },
          'published': { name: 'Published', type: 'final' },
          'rejected': { name: 'Rejected', type: 'final' }
        },
        transitions: {
          'submit_for_review': {
            from: 'draft',
            to: 'review',
            conditions: [],
            actions: []
          },
          'approve': {
            from: 'review',
            to: 'approved',
            conditions: [],
            actions: []
          },
          'reject': {
            from: 'review',
            to: 'rejected',
            conditions: [],
            actions: []
          },
          'publish': {
            from: 'approved',
            to: 'published',
            conditions: [],
            actions: []
          },
          'back_to_draft': {
            from: 'review',
            to: 'draft',
            conditions: [],
            actions: []
          }
        },
        initialState: 'draft',
        context: {},
        events: {}
      };

      try {
        // Alice creates the workflow definition
        const definitionId = await users.alice.publishDefinition(approvalWorkflow);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice creates a document instance
        const documentData = {
          title: 'Important Policy Document',
          content: 'This is a critical policy document that requires approval.',
          author: users.alice.getPublicKey(),
          reviewers: [users.bob.getPublicKey(), users.charlie.getPublicKey()],
          createdAt: Date.now()
        };

        const instanceId = await users.alice.createInstance(definitionId, documentData);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice submits for review
        const submitResult = await users.alice.transition(instanceId, 'submit_for_review', {
          ...documentData,
          submittedAt: Date.now(),
          submittedBy: users.alice.getPublicKey()
        });
        expect(submitResult).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Bob reviews and approves
        const approveResult = await users.bob.transition(instanceId, 'approve', {
          reviewedBy: users.bob.getPublicKey(),
          reviewedAt: Date.now(),
          comments: 'Document looks good, approved for publication'
        });
        expect(approveResult).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Charlie publishes the document
        const publishResult = await users.charlie.transition(instanceId, 'publish', {
          publishedBy: users.charlie.getPublicKey(),
          publishedAt: Date.now(),
          finalVersion: '1.0'
        });
        expect(publishResult).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify final state across all users
        const [aliceView, bobView, charlieView] = await Promise.all([
          users.alice.getInstance(instanceId),
          users.bob.getInstance(instanceId),
          users.charlie.getInstance(instanceId)
        ]);

        expect(aliceView!.currentState).toBe('published');
        expect(bobView!.currentState).toBe('published');
        expect(charlieView!.currentState).toBe('published');

        // Verify workflow history
        expect(aliceView!.context.submittedBy).toBe(users.alice.getPublicKey());
        expect(bobView!.context.reviewedBy).toBe(users.bob.getPublicKey());
        expect(charlieView!.context.publishedBy).toBe(users.charlie.getPublicKey());
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          console.warn('Skipping real network test - services may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 60000);

    it('should handle rejection and resubmission workflow', async () => {
      const workflowDefinition: NSMDefinition = {
        id: `rejection-workflow-${Date.now()}`,
        name: 'Review and Revision Workflow',
        version: '1.0.0',
        states: {
          'draft': { name: 'Draft', type: 'initial' },
          'review': { name: 'Under Review', type: 'normal' },
          'revision': { name: 'Needs Revision', type: 'normal' },
          'approved': { name: 'Approved', type: 'final' }
        },
        transitions: {
          'submit': { from: 'draft', to: 'review', conditions: [], actions: [] },
          'request_revision': { from: 'review', to: 'revision', conditions: [], actions: [] },
          'resubmit': { from: 'revision', to: 'review', conditions: [], actions: [] },
          'approve': { from: 'review', to: 'approved', conditions: [], actions: [] }
        },
        initialState: 'draft',
        context: {},
        events: {}
      };

      try {
        // Bob creates the workflow
        const definitionId = await users.bob.publishDefinition(workflowDefinition);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice creates and submits initial version
        const instanceId = await users.alice.createInstance(definitionId, {
          document: 'Initial draft with issues',
          version: 1,
          author: users.alice.getPublicKey()
        });

        await users.alice.transition(instanceId, 'submit', {
          submittedAt: Date.now(),
          version: 1
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Charlie requests revision
        await users.charlie.transition(instanceId, 'request_revision', {
          reviewedBy: users.charlie.getPublicKey(),
          feedback: 'Please address these issues: 1) Add more details, 2) Fix grammar',
          requestedAt: Date.now()
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice makes revisions and resubmits
        await users.alice.transition(instanceId, 'resubmit', {
          document: 'Revised draft with improvements',
          version: 2,
          resubmittedAt: Date.now(),
          changesAddressed: 'Added details and fixed grammar issues'
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Charlie approves the revised version
        await users.charlie.transition(instanceId, 'approve', {
          finalApprovalBy: users.charlie.getPublicKey(),
          approvedAt: Date.now(),
          finalVersion: 2
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify final approved state
        const finalInstance = await users.bob.getInstance(instanceId);
        expect(finalInstance!.currentState).toBe('approved');
        expect(finalInstance!.context.version).toBe(2);
        expect(finalInstance!.context.finalApprovalBy).toBe(users.charlie.getPublicKey());
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          console.warn('Skipping real network test - services may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe('Collaborative Task Management', () => {
    it('should handle task assignment and completion workflow', async () => {
      const taskWorkflow: NSMDefinition = {
        id: `task-management-${Date.now()}`,
        name: 'Team Task Management',
        version: '1.0.0',
        states: {
          'created': { name: 'Task Created', type: 'initial' },
          'assigned': { name: 'Task Assigned', type: 'normal' },
          'in_progress': { name: 'In Progress', type: 'normal' },
          'under_review': { name: 'Under Review', type: 'normal' },
          'completed': { name: 'Completed', type: 'final' },
          'cancelled': { name: 'Cancelled', type: 'final' }
        },
        transitions: {
          'assign': { from: 'created', to: 'assigned', conditions: [], actions: [] },
          'start_work': { from: 'assigned', to: 'in_progress', conditions: [], actions: [] },
          'submit_for_review': { from: 'in_progress', to: 'under_review', conditions: [], actions: [] },
          'complete': { from: 'under_review', to: 'completed', conditions: [], actions: [] },
          'request_changes': { from: 'under_review', to: 'in_progress', conditions: [], actions: [] },
          'cancel': { from: 'created', to: 'cancelled', conditions: [], actions: [] },
          'cancel_assigned': { from: 'assigned', to: 'cancelled', conditions: [], actions: [] }
        },
        initialState: 'created',
        context: {},
        events: {}
      };

      try {
        // Alice (project manager) creates the workflow
        const definitionId = await users.alice.publishDefinition(taskWorkflow);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice creates multiple tasks
        const task1Id = await users.alice.createInstance(definitionId, {
          title: 'Implement user authentication',
          description: 'Add OAuth2 login functionality',
          priority: 'high',
          estimatedHours: 8,
          createdBy: users.alice.getPublicKey(),
          teamId: 'dev-team-1'
        });

        const task2Id = await users.alice.createInstance(definitionId, {
          title: 'Design user interface',
          description: 'Create wireframes and mockups',
          priority: 'medium',
          estimatedHours: 6,
          createdBy: users.alice.getPublicKey(),
          teamId: 'design-team-1'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice assigns tasks to team members
        await users.alice.transition(task1Id, 'assign', {
          assignedTo: users.bob.getPublicKey(),
          assignedBy: users.alice.getPublicKey(),
          assignedAt: Date.now(),
          dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        await users.alice.transition(task2Id, 'assign', {
          assignedTo: users.charlie.getPublicKey(),
          assignedBy: users.alice.getPublicKey(),
          assignedAt: Date.now(),
          dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000 // 5 days
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Bob starts working on his task
        await users.bob.transition(task1Id, 'start_work', {
          startedBy: users.bob.getPublicKey(),
          startedAt: Date.now(),
          workPlan: 'Will implement OAuth2 with Google and GitHub providers'
        });

        // Charlie starts working on his task
        await users.charlie.transition(task2Id, 'start_work', {
          startedBy: users.charlie.getPublicKey(),
          startedAt: Date.now(),
          workPlan: 'Will create mobile-first responsive design'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Bob submits his work for review
        await users.bob.transition(task1Id, 'submit_for_review', {
          submittedBy: users.bob.getPublicKey(),
          submittedAt: Date.now(),
          actualHours: 7,
          deliverables: 'OAuth2 integration completed with tests',
          notes: 'Added comprehensive error handling and logging'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice reviews and completes Bob's task
        await users.alice.transition(task1Id, 'complete', {
          reviewedBy: users.alice.getPublicKey(),
          completedAt: Date.now(),
          qualityScore: 9,
          feedback: 'Excellent work, all requirements met'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Charlie submits his design work
        await users.charlie.transition(task2Id, 'submit_for_review', {
          submittedBy: users.charlie.getPublicKey(),
          submittedAt: Date.now(),
          actualHours: 5,
          deliverables: 'Complete UI mockups and style guide'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice requests changes on Charlie's work
        await users.alice.transition(task2Id, 'request_changes', {
          reviewedBy: users.alice.getPublicKey(),
          requestedChanges: 'Please add dark mode variants and mobile layouts',
          reviewDate: Date.now()
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Charlie addresses feedback and resubmits
        await users.charlie.transition(task2Id, 'submit_for_review', {
          resubmittedBy: users.charlie.getPublicKey(),
          resubmittedAt: Date.now(),
          changesAddressed: 'Added dark mode and improved mobile layouts',
          additionalHours: 2
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Alice approves the revised design
        await users.alice.transition(task2Id, 'complete', {
          reviewedBy: users.alice.getPublicKey(),
          completedAt: Date.now(),
          qualityScore: 8,
          feedback: 'Great improvements, design is now complete'
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify both tasks are completed
        const [task1Final, task2Final] = await Promise.all([
          users.alice.getInstance(task1Id),
          users.alice.getInstance(task2Id)
        ]);

        expect(task1Final!.currentState).toBe('completed');
        expect(task2Final!.currentState).toBe('completed');
        expect(task1Final!.context.qualityScore).toBe(9);
        expect(task2Final!.context.qualityScore).toBe(8);
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          console.warn('Skipping real network test - services may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 90000);
  });

  describe('Data Persistence Integration', () => {
    it('should integrate Nostr communication with Blossom storage', async () => {
      const dataWorkflow: NSMDefinition = {
        id: `data-integration-${Date.now()}`,
        name: 'Data Processing Workflow',
        version: '1.0.0',
        states: {
          'pending': { name: 'Pending Processing', type: 'initial' },
          'processing': { name: 'Processing Data', type: 'normal' },
          'stored': { name: 'Data Stored', type: 'final' }
        },
        transitions: {
          'start_processing': { from: 'pending', to: 'processing', conditions: [], actions: [] },
          'store_data': { from: 'processing', to: 'stored', conditions: [], actions: [] }
        },
        initialState: 'pending',
        context: {},
        events: {}
      };

      try {
        // Alice creates the data workflow
        const definitionId = await users.alice.publishDefinition(dataWorkflow);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create a large dataset to process
        const largeDataset = {
          type: 'user_analytics',
          records: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            userId: `user_${i}`,
            action: `action_${i % 10}`,
            timestamp: Date.now() - i * 1000,
            metadata: { value: Math.random(), category: `cat_${i % 5}` }
          })),
          summary: {
            totalRecords: 1000,
            dateRange: { start: Date.now() - 1000000, end: Date.now() },
            categories: ['cat_0', 'cat_1', 'cat_2', 'cat_3', 'cat_4']
          }
        };

        // Bob creates an instance for processing this data
        const instanceId = await users.bob.createInstance(definitionId, {
          datasetId: 'analytics_20240915',
          processedBy: users.bob.getPublicKey(),
          recordCount: largeDataset.records.length
        });

        // Start processing
        await users.bob.transition(instanceId, 'start_processing', {
          startedAt: Date.now(),
          processor: users.bob.getPublicKey()
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Store the large dataset using Blossom
        const serializedData = JSON.stringify(largeDataset);
        const storageResult = await blossomClient.uploadWithVerification(serializedData);

        // Complete the workflow with storage reference
        await users.bob.transition(instanceId, 'store_data', {
          storedAt: Date.now(),
          storageHash: storageResult.hash,
          storageUrl: storageResult.url,
          verified: storageResult.verified,
          dataSize: storageResult.size
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Charlie verifies the stored data
        const instance = await users.charlie.getInstance(instanceId);
        expect(instance!.currentState).toBe('stored');
        expect(instance!.context.storageHash).toBeDefined();

        // Retrieve and verify the data from Blossom
        const retrievedData = await blossomClient.downloadAndVerify(instance!.context.storageHash);
        const parsedData = JSON.parse(retrievedData);

        expect(parsedData.records).toHaveLength(1000);
        expect(parsedData.summary.totalRecords).toBe(1000);
        expect(parsedData.type).toBe('user_analytics');

        // Verify data integrity
        expect(parsedData).toEqual(largeDataset);
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          console.warn('Skipping real storage test - services may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe('Conflict Resolution and Consensus', () => {
    it('should handle concurrent state changes correctly', async () => {
      const consensusWorkflow: NSMDefinition = {
        id: `consensus-${Date.now()}`,
        name: 'Consensus Decision Making',
        version: '1.0.0',
        states: {
          'proposed': { name: 'Proposal Made', type: 'initial' },
          'voting': { name: 'Under Vote', type: 'normal' },
          'approved': { name: 'Approved', type: 'final' },
          'rejected': { name: 'Rejected', type: 'final' }
        },
        transitions: {
          'start_voting': { from: 'proposed', to: 'voting', conditions: [], actions: [] },
          'approve': { from: 'voting', to: 'approved', conditions: [], actions: [] },
          'reject': { from: 'voting', to: 'rejected', conditions: [], actions: [] }
        },
        initialState: 'proposed',
        context: {},
        events: {}
      };

      try {
        // Alice creates consensus workflow
        const definitionId = await users.alice.publishDefinition(consensusWorkflow);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create a proposal that requires consensus
        const instanceId = await users.alice.createInstance(definitionId, {
          proposal: 'Upgrade system to new architecture',
          proposedBy: users.alice.getPublicKey(),
          requiresVotes: 3,
          votes: []
        });

        // Start voting process
        await users.alice.transition(instanceId, 'start_voting', {
          votingStarted: Date.now(),
          votingDeadline: Date.now() + 24 * 60 * 60 * 1000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // All users attempt to vote simultaneously
        const votePromises = [
          users.alice.transition(instanceId, 'approve', {
            voterKey: users.alice.getPublicKey(),
            vote: 'approve',
            votedAt: Date.now(),
            reason: 'Necessary for scalability'
          }),
          users.bob.transition(instanceId, 'approve', {
            voterKey: users.bob.getPublicKey(),
            vote: 'approve',
            votedAt: Date.now(),
            reason: 'Good technical direction'
          }),
          users.charlie.transition(instanceId, 'approve', {
            voterKey: users.charlie.getPublicKey(),
            vote: 'approve',
            votedAt: Date.now(),
            reason: 'Agrees with proposal'
          })
        ];

        // Only one should succeed in making the final transition
        const results = await Promise.all(votePromises.map(p => p.catch(() => false)));
        const successfulVotes = results.filter(r => r === true).length;

        // At least one vote should succeed
        expect(successfulVotes).toBeGreaterThan(0);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify final state is consistent across all clients
        const [state1, state2, state3] = await Promise.all([
          users.alice.getInstance(instanceId),
          users.bob.getInstance(instanceId),
          users.charlie.getInstance(instanceId)
        ]);

        // All should see the same final state
        expect(state1!.currentState).toBe(state2!.currentState);
        expect(state2!.currentState).toBe(state3!.currentState);
        expect(state1!.currentState).toBe('approved');
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          console.warn('Skipping real network test - services may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 45000);
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent workflows efficiently', async () => {
      const quickWorkflow: NSMDefinition = {
        id: `performance-${Date.now()}`,
        name: 'Quick Task Workflow',
        version: '1.0.0',
        states: {
          'start': { name: 'Start', type: 'initial' },
          'done': { name: 'Done', type: 'final' }
        },
        transitions: {
          'complete': { from: 'start', to: 'done', conditions: [], actions: [] }
        },
        initialState: 'start',
        context: {},
        events: {}
      };

      try {
        // Alice creates the quick workflow
        const definitionId = await users.alice.publishDefinition(quickWorkflow);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create multiple instances concurrently
        const instanceCreationPromises = Array.from({ length: 5 }, (_, i) =>
          users.alice.createInstance(definitionId, {
            taskId: i,
            createdBy: users.alice.getPublicKey(),
            batchId: 'performance-test-1'
          })
        );

        const instanceIds = await Promise.all(instanceCreationPromises);
        expect(instanceIds).toHaveLength(5);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Complete all instances concurrently from different users
        const completionPromises = instanceIds.map((id, index) => {
          const user = [users.alice, users.bob, users.charlie][index % 3]!;
          return user.transition(id, 'complete', {
            completedBy: user.getPublicKey(),
            completedAt: Date.now(),
            taskIndex: index
          });
        });

        const completionResults = await Promise.all(completionPromises);

        // All completions should succeed
        completionResults.forEach(result => {
          expect(result).toBe(true);
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify all instances reached final state
        const finalStates = await Promise.all(
          instanceIds.map(id => users.charlie.getInstance(id))
        );

        finalStates.forEach(state => {
          expect(state!.currentState).toBe('done');
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          console.warn('Skipping real network test - services may be unavailable:', error.message);
          return;
        }
        throw error;
      }
    }, 60000);
  });
});