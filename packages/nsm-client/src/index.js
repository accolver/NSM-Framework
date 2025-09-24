"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonInvalidationRules = exports.createNSMInvalidationManager = exports.CacheInvalidationManager = exports.BlossomContentCache = exports.NostrEventCache = exports.IndexedDBCache = exports.MemoryCache = exports.ObjectPool = exports.LRUCache = exports.OptimizedActor = exports.OptimizedStateMachine = exports.NSMStateMachine = exports.securitySandbox = exports.CSPManager = exports.SecurityError = exports.SecuritySandbox = exports.DoSViolationType = exports.DoSProtection = exports.SECURITY_CONFIG = exports.ValidationUtils = exports.verifyBlossomContent = exports.verifyNostrEvent = exports.createCryptoSuite = exports.CryptoNSMClient = exports.NSMClient = void 0;
var nsm_client_1 = require("./nsm-client");
Object.defineProperty(exports, "NSMClient", { enumerable: true, get: function () { return nsm_client_1.NSMClient; } });
var crypto_client_1 = require("./crypto-client");
Object.defineProperty(exports, "CryptoNSMClient", { enumerable: true, get: function () { return crypto_client_1.CryptoNSMClient; } });
// Re-export crypto utilities for convenience
var crypto_1 = require("@nsm/crypto");
Object.defineProperty(exports, "createCryptoSuite", { enumerable: true, get: function () { return crypto_1.createCryptoSuite; } });
Object.defineProperty(exports, "verifyNostrEvent", { enumerable: true, get: function () { return crypto_1.verifyNostrEvent; } });
Object.defineProperty(exports, "verifyBlossomContent", { enumerable: true, get: function () { return crypto_1.verifyBlossomContent; } });
Object.defineProperty(exports, "ValidationUtils", { enumerable: true, get: function () { return crypto_1.ValidationUtils; } });
Object.defineProperty(exports, "SECURITY_CONFIG", { enumerable: true, get: function () { return crypto_1.SECURITY_CONFIG; } });
// Export DoS protection components
var dos_protection_1 = require("./security/dos-protection");
Object.defineProperty(exports, "DoSProtection", { enumerable: true, get: function () { return dos_protection_1.DoSProtection; } });
Object.defineProperty(exports, "DoSViolationType", { enumerable: true, get: function () { return dos_protection_1.DoSViolationType; } });
// Export security sandbox components
var sandbox_1 = require("./security/sandbox");
Object.defineProperty(exports, "SecuritySandbox", { enumerable: true, get: function () { return sandbox_1.SecuritySandbox; } });
Object.defineProperty(exports, "SecurityError", { enumerable: true, get: function () { return sandbox_1.SecurityError; } });
Object.defineProperty(exports, "CSPManager", { enumerable: true, get: function () { return sandbox_1.CSPManager; } });
Object.defineProperty(exports, "securitySandbox", { enumerable: true, get: function () { return sandbox_1.securitySandbox; } });
// Export state machine components
var state_machine_1 = require("./state-machine");
Object.defineProperty(exports, "NSMStateMachine", { enumerable: true, get: function () { return state_machine_1.NSMStateMachine; } });
var state_machine_optimized_1 = require("./state-machine-optimized");
Object.defineProperty(exports, "OptimizedStateMachine", { enumerable: true, get: function () { return state_machine_optimized_1.OptimizedStateMachine; } });
Object.defineProperty(exports, "OptimizedActor", { enumerable: true, get: function () { return state_machine_optimized_1.OptimizedActor; } });
// Export performance utilities
var lru_cache_1 = require("./utils/lru-cache");
Object.defineProperty(exports, "LRUCache", { enumerable: true, get: function () { return lru_cache_1.LRUCache; } });
var object_pool_1 = require("./utils/object-pool");
Object.defineProperty(exports, "ObjectPool", { enumerable: true, get: function () { return object_pool_1.ObjectPool; } });
// Export cache components
var memory_cache_1 = require("./cache/memory-cache");
Object.defineProperty(exports, "MemoryCache", { enumerable: true, get: function () { return memory_cache_1.MemoryCache; } });
var indexeddb_cache_1 = require("./cache/indexeddb-cache");
Object.defineProperty(exports, "IndexedDBCache", { enumerable: true, get: function () { return indexeddb_cache_1.IndexedDBCache; } });
var nostr_event_cache_1 = require("./cache/nostr-event-cache");
Object.defineProperty(exports, "NostrEventCache", { enumerable: true, get: function () { return nostr_event_cache_1.NostrEventCache; } });
var blossom_content_cache_1 = require("./cache/blossom-content-cache");
Object.defineProperty(exports, "BlossomContentCache", { enumerable: true, get: function () { return blossom_content_cache_1.BlossomContentCache; } });
var cache_invalidation_1 = require("./cache/cache-invalidation");
Object.defineProperty(exports, "CacheInvalidationManager", { enumerable: true, get: function () { return cache_invalidation_1.CacheInvalidationManager; } });
Object.defineProperty(exports, "createNSMInvalidationManager", { enumerable: true, get: function () { return cache_invalidation_1.createNSMInvalidationManager; } });
Object.defineProperty(exports, "CommonInvalidationRules", { enumerable: true, get: function () { return cache_invalidation_1.CommonInvalidationRules; } });
