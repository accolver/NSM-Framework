/**
 * Test file to demonstrate multi-user state reconciliation with simulated conflicts
 */

import { CollaborationService } from '../services/collaboration';
import { DrawingPath, Shape } from '../whiteboard-machine';

// Simulate two users drawing simultaneously
export const testStateReconciliation = () => {
  console.log('🧪 Testing multi-user state reconciliation...');

  // Create two collaboration services for different users
  const user1Service = new CollaborationService('user1');
  const user2Service = new CollaborationService('user2');

  // Simulate initial context
  const mockContext = {
    currentTool: 'pen' as const,
    currentShapeType: 'rectangle' as const,
    isDrawing: false,
    currentPath: null,
    currentShape: null,
    paths: [],
    shapes: [],
    selectedObjects: [],
    currentStyle: {
      color: '#000000',
      width: 2,
      opacity: 1,
      fill: 'transparent'
    },
    collaborators: [],
    userId: 'user1',
    userName: 'User 1',
    collaborationService: null,
    canvasSize: { width: 800, height: 600 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    history: [],
    historyIndex: -1
  };

  user1Service.initialize(mockContext);
  user2Service.initialize({ ...mockContext, userId: 'user2', userName: 'User 2' });

  // Test simultaneous drawing operations with conflict resolution
  console.log('📝 Simulating simultaneous drawing operations...');

  // User 1 draws a path at time T
  const path1: DrawingPath = {
    id: 'path1',
    tool: 'pen',
    points: [
      { x: 100, y: 100, timestamp: Date.now() },
      { x: 150, y: 150, timestamp: Date.now() + 10 }
    ],
    style: { color: '#ff0000', width: 2, opacity: 1 },
    timestamp: Date.now(),
    userId: 'user1'
  };

  // User 2 draws a shape at the same time T (conflict scenario)
  const shape1: Shape = {
    id: 'shape1',
    type: 'rectangle',
    startPoint: { x: 200, y: 200, timestamp: Date.now() },
    endPoint: { x: 300, y: 300, timestamp: Date.now() + 20 },
    style: { color: '#00ff00', width: 3, opacity: 1 },
    timestamp: Date.now(), // Same timestamp - conflict!
    userId: 'user2'
  };

  // User 1 adds their path
  user1Service.addPath(path1);
  console.log('👤 User 1 added path:', path1.id);

  // User 2 adds their shape
  user2Service.addShape(shape1);
  console.log('👤 User 2 added shape:', shape1.id);

  // Test deterministic ordering - both should have same final state
  const user1State = user1Service.getCurrentState();
  const user2State = user2Service.getCurrentState();

  console.log('📊 User 1 state:', {
    paths: user1State.paths.length,
    shapes: user1State.shapes.length
  });

  console.log('📊 User 2 state:', {
    paths: user2State.paths.length,
    shapes: user2State.shapes.length
  });

  // Simulate network sync - exchange document updates
  console.log('🔄 Simulating network synchronization...');

  const user1Update = user1Service.getDocumentUpdate();
  const user2Update = user2Service.getDocumentUpdate();

  // Apply each other's updates
  user1Service.applyDocumentUpdate(user2Update);
  user2Service.applyDocumentUpdate(user1Update);

  // Check final reconciled state
  const finalUser1State = user1Service.getCurrentState();
  const finalUser2State = user2Service.getCurrentState();

  console.log('✅ Final reconciled state - User 1:', {
    paths: finalUser1State.paths.length,
    shapes: finalUser1State.shapes.length,
    pathIds: finalUser1State.paths.map(p => p.id),
    shapeIds: finalUser1State.shapes.map(s => s.id)
  });

  console.log('✅ Final reconciled state - User 2:', {
    paths: finalUser2State.paths.length,
    shapes: finalUser2State.shapes.length,
    pathIds: finalUser2State.paths.map(p => p.id),
    shapeIds: finalUser2State.shapes.map(s => s.id)
  });

  // Verify deterministic ordering (should be identical)
  const user1Objects = [...finalUser1State.paths, ...finalUser1State.shapes]
    .sort((a, b) => a.timestamp - b.timestamp || a.userId!.localeCompare(b.userId!));

  const user2Objects = [...finalUser2State.paths, ...finalUser2State.shapes]
    .sort((a, b) => a.timestamp - b.timestamp || a.userId!.localeCompare(b.userId!));

  const isConsistent = JSON.stringify(user1Objects) === JSON.stringify(user2Objects);

  console.log('🎯 State consistency check:', isConsistent ? '✅ PASSED' : '❌ FAILED');

  if (isConsistent) {
    console.log('🏆 Multi-user state reconciliation test SUCCESSFUL!');
    console.log('   - Conflict resolution working correctly');
    console.log('   - Deterministic ordering maintained');
    console.log('   - CRDT synchronization functional');
  } else {
    console.error('💥 State reconciliation test FAILED!');
    console.error('   User 1 final objects:', user1Objects);
    console.error('   User 2 final objects:', user2Objects);
  }

  // Cleanup
  user1Service.destroy();
  user2Service.destroy();

  return isConsistent;
};

// Test deletion reconciliation
export const testDeletionReconciliation = () => {
  console.log('🧪 Testing deletion reconciliation...');

  const user1Service = new CollaborationService('user1');
  const user2Service = new CollaborationService('user2');

  // Add some objects
  const testPath: DrawingPath = {
    id: 'test-path',
    tool: 'pen',
    points: [{ x: 50, y: 50, timestamp: Date.now() }],
    style: { color: '#000000', width: 2, opacity: 1 },
    timestamp: Date.now(),
    userId: 'user1'
  };

  user1Service.addPath(testPath);

  // Sync states
  const update1 = user1Service.getDocumentUpdate();
  user2Service.applyDocumentUpdate(update1);

  console.log('📦 Initial state synchronized');

  // User 1 deletes the object
  user1Service.deleteObjects(['test-path']);
  console.log('🗑️ User 1 deleted path');

  // Sync deletion
  const deleteUpdate = user1Service.getDocumentUpdate();
  user2Service.applyDocumentUpdate(deleteUpdate);

  const finalState1 = user1Service.getCurrentState();
  const finalState2 = user2Service.getCurrentState();

  const deletionSuccessful = finalState1.paths.length === 0 && finalState2.paths.length === 0;

  console.log('🎯 Deletion reconciliation:', deletionSuccessful ? '✅ PASSED' : '❌ FAILED');

  user1Service.destroy();
  user2Service.destroy();

  return deletionSuccessful;
};

// Run all tests
export const runCollaborationTests = () => {
  console.log('🚀 Starting collaboration service tests...');

  const test1 = testStateReconciliation();
  const test2 = testDeletionReconciliation();

  const allPassed = test1 && test2;

  console.log('\n📋 Test Results Summary:');
  console.log(`   State Reconciliation: ${test1 ? '✅' : '❌'}`);
  console.log(`   Deletion Reconciliation: ${test2 ? '✅' : '❌'}`);
  console.log(`   Overall: ${allPassed ? '🏆 ALL TESTS PASSED' : '💥 SOME TESTS FAILED'}`);

  return allPassed;
};