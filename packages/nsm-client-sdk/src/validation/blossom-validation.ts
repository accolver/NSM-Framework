/**
 * Blossom Content Validation Integration
 * Extends the Blossom client with comprehensive validation capabilities
 */

import {
  validateFileUpload,
  validateURL,
  sanitizeUserInput,
  type ValidationResult
} from "@nsm/core/validation";
import { calculateSHA256, verifyContentIntegrity, isValidContentType } from "../blossom/utils.js";

/**
 * Blossom-specific validation configuration
 */
export interface BlossomValidationConfig {
  /** Maximum file size for uploads (bytes) */
  maxFileSize?: number;
  /** Allowed content types */
  allowedContentTypes?: string[];
  /** Allowed file extensions */
  allowedExtensions?: string[];
  /** Enable content integrity verification */
  verifyIntegrity?: boolean;
  /** Enable virus scanning (placeholder for future implementation) */
  enableVirusScanning?: boolean;
  /** Maximum metadata size (bytes) */
  maxMetadataSize?: number;
}

/**
 * Default Blossom validation configuration
 */
const DEFAULT_BLOSSOM_CONFIG: Required<BlossomValidationConfig> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedContentTypes: [
    'application/javascript',
    'application/json',
    'text/plain',
    'text/javascript',
    'application/wasm',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm'
  ],
  allowedExtensions: [
    '.js', '.mjs', '.json', '.txt', '.md',
    '.wasm', '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.mp3', '.wav', '.mp4', '.webm'
  ],
  verifyIntegrity: true,
  enableVirusScanning: false, // Future feature
  maxMetadataSize: 4096 // 4KB
};

/**
 * Blossom content validation result
 */
export interface BlossomValidationResult<T = unknown> extends ValidationResult<T> {
  /** Computed content hash */
  contentHash?: string;
  /** Content type validation result */
  validContentType?: boolean;
  /** File size in bytes */
  fileSize?: number;
  /** Security risk score (0-100) */
  riskScore?: number;
}

/**
 * Blossom Content Validator
 * Provides comprehensive validation for content uploaded to Blossom servers
 */
export class BlossomContentValidator {
  private config: Required<BlossomValidationConfig>;

  constructor(config: BlossomValidationConfig = {}) {
    this.config = { ...DEFAULT_BLOSSOM_CONFIG, ...config };
  }

  /**
   * Validate content before upload to Blossom server
   */
  async validateContent(
    content: string | Uint8Array | File,
    contentType?: string,
    expectedHash?: string
  ): Promise<BlossomValidationResult<{
    content: string | Uint8Array;
    contentType: string;
    size: number;
    hash: string;
  }>> {
    try {
      // Handle different content types
      let contentData: string | Uint8Array;
      let actualContentType: string;
      let fileSize: number;
      let fileName: string = 'unknown';

      if (content instanceof File) {
        // File upload validation
        const fileValidation = validateFileUpload(content, {
          allowedTypes: this.config.allowedContentTypes,
          maxSize: this.config.maxFileSize,
          allowedExtensions: this.config.allowedExtensions
        });

        if (!fileValidation.success) {
          return {
            success: false,
            error: fileValidation.error,
            riskScore: 50
          };
        }

        contentData = new Uint8Array(await content.arrayBuffer());
        actualContentType = content.type;
        fileSize = content.size;
        fileName = content.name;
      } else {
        contentData = content;
        actualContentType = contentType || 'application/octet-stream';
        fileSize = typeof content === 'string'
          ? new TextEncoder().encode(content).length
          : content.length;
      }

      // Content type validation
      if (!isValidContentType(actualContentType) ||
          !this.config.allowedContentTypes.includes(actualContentType)) {
        return {
          success: false,
          error: `Invalid or disallowed content type: ${actualContentType}`,
          validContentType: false,
          riskScore: 75
        };
      }

      // Size validation
      if (fileSize > this.config.maxFileSize) {
        return {
          success: false,
          error: `Content too large: ${fileSize} bytes (max: ${this.config.maxFileSize})`,
          fileSize,
          riskScore: 30
        };
      }

      // Calculate content hash
      const contentHash = await calculateSHA256(contentData);

      // Integrity verification if expected hash provided
      if (expectedHash && this.config.verifyIntegrity) {
        const integrityValid = await verifyContentIntegrity(contentData, expectedHash);
        if (!integrityValid) {
          return {
            success: false,
            error: `Content integrity check failed. Expected: ${expectedHash}, Got: ${contentHash}`,
            contentHash,
            riskScore: 90
          };
        }
      }

      // Security analysis
      const securityResult = await this.analyzeContentSecurity(contentData, actualContentType, fileName);
      if (!securityResult.success) {
        return {
          success: false,
          error: securityResult.error,
          contentHash,
          riskScore: securityResult.riskScore || 80
        };
      }

      // Content-specific validation
      const contentSpecificResult = await this.validateContentType(contentData, actualContentType);
      if (!contentSpecificResult.success) {
        return {
          success: false,
          error: contentSpecificResult.error,
          contentHash,
          riskScore: contentSpecificResult.riskScore || 60
        };
      }

      return {
        success: true,
        data: {
          content: contentData,
          contentType: actualContentType,
          size: fileSize,
          hash: contentHash
        },
        contentHash,
        validContentType: true,
        fileSize,
        riskScore: securityResult.riskScore || 0
      };

    } catch (error) {
      return {
        success: false,
        error: `Content validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskScore: 100
      };
    }
  }

  /**
   * Validate Blossom server URL
   */
  validateBlossomURL(url: string): ValidationResult<string> {
    const urlValidation = validateURL(url, {
      allowedProtocols: ['http:', 'https:'],
      blockPrivateIPs: false // Blossom servers might be on private networks
    });

    if (!urlValidation.success) {
      return urlValidation;
    }

    try {
      const parsedUrl = new URL(url);

      // Validate Blossom-specific URL patterns
      if (parsedUrl.pathname.includes('..') || parsedUrl.pathname.includes('//')) {
        return {
          success: false,
          error: "Invalid URL path: contains path traversal patterns"
        };
      }

      // Validate query parameters for safety
      for (const [key, value] of parsedUrl.searchParams.entries()) {
        const paramValidation = sanitizeUserInput(key + value, { maxLength: 1000 });
        if (!paramValidation.success) {
          return {
            success: false,
            error: `Invalid URL parameter: ${paramValidation.error}`
          };
        }
      }

      return {
        success: true,
        data: url
      };

    } catch (error) {
      return {
        success: false,
        error: `URL parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate Blossom metadata
   */
  validateMetadata(metadata: unknown): ValidationResult<object> {
    try {
      if (!metadata || typeof metadata !== 'object') {
        return {
          success: false,
          error: "Metadata must be an object"
        };
      }

      // Size check
      const serialized = JSON.stringify(metadata);
      if (serialized.length > this.config.maxMetadataSize) {
        return {
          success: false,
          error: `Metadata too large: ${serialized.length} bytes (max: ${this.config.maxMetadataSize})`
        };
      }

      // Content sanitization
      const sanitizedResult = sanitizeUserInput(serialized, {
        maxLength: this.config.maxMetadataSize,
        allowHTML: false
      });

      if (!sanitizedResult.success) {
        return {
          success: false,
          error: `Unsafe metadata content: ${sanitizedResult.error}`
        };
      }

      // Validate metadata structure
      const metadataObj = metadata as any;

      // Check for reserved keys or dangerous patterns
      const reservedKeys = ['__proto__', 'constructor', 'prototype'];
      for (const key of Object.keys(metadataObj)) {
        if (reservedKeys.includes(key)) {
          return {
            success: false,
            error: `Reserved metadata key: ${key}`
          };
        }
      }

      return {
        success: true,
        data: metadata as object
      };

    } catch (error) {
      return {
        success: false,
        error: `Metadata validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<BlossomValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<BlossomValidationConfig> {
    return { ...this.config };
  }

  // Private helper methods

  /**
   * Analyze content for security risks
   */
  private async analyzeContentSecurity(
    content: string | Uint8Array,
    contentType: string,
    fileName: string
  ): Promise<ValidationResult<{ riskScore: number }>> {
    let riskScore = 0;
    const errors: string[] = [];

    try {
      // Convert to string for pattern analysis if it's text-based content
      let contentString = '';
      if (typeof content === 'string') {
        contentString = content;
      } else if (contentType.startsWith('text/') || contentType.includes('javascript') || contentType.includes('json')) {
        contentString = new TextDecoder().decode(content);
      }

      if (contentString) {
        // Check for malicious patterns in text content
        const dangerousPatterns = [
          /eval\s*\(/gi,
          /Function\s*\(/gi,
          /document\.write/gi,
          /innerHTML\s*=/gi,
          /outerHTML\s*=/gi,
          /setTimeout\s*\(/gi,
          /setInterval\s*\(/gi,
          /<script[^>]*>.*?<\/script>/gis,
          /javascript:/gi,
          /vbscript:/gi,
          /data:text\/html/gi,
          /on\w+\s*=/gi
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(contentString)) {
            riskScore += 25;
            errors.push(`Dangerous pattern detected: ${pattern.source}`);
          }
        }

        // Check for suspicious strings
        const suspiciousStrings = [
          'crypto.subtle',
          'XMLHttpRequest',
          'fetch(',
          'WebSocket',
          'eval(',
          'Function(',
          'setTimeout',
          'setInterval'
        ];

        for (const suspicious of suspiciousStrings) {
          if (contentString.includes(suspicious)) {
            riskScore += 10;
          }
        }
      }

      // File name analysis
      if (fileName) {
        // Double extension check
        if (/\.\w+\.\w+$/.test(fileName)) {
          riskScore += 20;
          errors.push("Suspicious double file extension");
        }

        // Executable file patterns
        const executablePatterns = /\.(exe|bat|cmd|scr|com|pif|vbs|js|jar|app|deb|rpm|msi)$/i;
        if (executablePatterns.test(fileName)) {
          riskScore += 30;
          errors.push("Executable file type detected");
        }
      }

      // Content type mismatch analysis
      if (contentType === 'text/plain' && contentString.includes('<script>')) {
        riskScore += 20;
        errors.push("Content type mismatch: HTML in text/plain");
      }

      if (riskScore >= 50) {
        return {
          success: false,
          error: `High security risk detected (score: ${riskScore}): ${errors.join(', ')}`,
          riskScore
        };
      }

      return {
        success: true,
        data: { riskScore }
      };

    } catch (error) {
      return {
        success: false,
        error: `Security analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskScore: 100
      };
    }
  }

  /**
   * Validate content based on its specific type
   */
  private async validateContentType(
    content: string | Uint8Array,
    contentType: string
  ): Promise<ValidationResult<{ riskScore: number }>> {
    try {
      let riskScore = 0;

      switch (contentType) {
        case 'application/javascript':
        case 'text/javascript':
          return this.validateJavaScript(content);

        case 'application/json':
          return this.validateJSON(content);

        case 'text/plain':
        case 'text/markdown':
          return this.validateText(content);

        case 'application/wasm':
          return this.validateWebAssembly(content);

        default:
          if (contentType.startsWith('image/')) {
            return this.validateImage(content);
          } else if (contentType.startsWith('audio/') || contentType.startsWith('video/')) {
            return this.validateMedia(content);
          }
          break;
      }

      return {
        success: true,
        data: { riskScore }
      };

    } catch (error) {
      return {
        success: false,
        error: `Content type validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskScore: 80
      };
    }
  }

  private validateJavaScript(content: string | Uint8Array): ValidationResult<{ riskScore: number }> {
    try {
      const jsCode = typeof content === 'string' ? content : new TextDecoder().decode(content);

      // Check for obviously malicious patterns
      const maliciousPatterns = [
        /crypto\.subtle\.importKey/gi,
        /navigator\.sendBeacon/gi,
        /document\.cookie/gi,
        /localStorage\./gi,
        /sessionStorage\./gi,
        /indexedDB/gi,
        /new\s+Worker\(/gi,
        /importScripts\(/gi
      ];

      let riskScore = 0;
      for (const pattern of maliciousPatterns) {
        if (pattern.test(jsCode)) {
          riskScore += 20;
        }
      }

      // Basic syntax check (simplified)
      try {
        // This would use a proper JS parser in production
        new Function(jsCode); // Basic syntax validation
      } catch {
        return {
          success: false,
          error: "JavaScript syntax error",
          riskScore: 60
        };
      }

      return {
        success: true,
        data: { riskScore }
      };

    } catch (error) {
      return {
        success: false,
        error: `JavaScript validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskScore: 70
      };
    }
  }

  private validateJSON(content: string | Uint8Array): ValidationResult<{ riskScore: number }> {
    try {
      const jsonString = typeof content === 'string' ? content : new TextDecoder().decode(content);

      // Parse JSON to validate structure
      const parsed = JSON.parse(jsonString);

      // Check for dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      function checkObject(obj: any): boolean {
        if (obj && typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            if (dangerousKeys.includes(key)) {
              return false;
            }
            if (!checkObject(obj[key])) {
              return false;
            }
          }
        }
        return true;
      }

      if (!checkObject(parsed)) {
        return {
          success: false,
          error: "JSON contains dangerous property names",
          riskScore: 80
        };
      }

      return {
        success: true,
        data: { riskScore: 0 }
      };

    } catch (error) {
      return {
        success: false,
        error: `JSON validation error: Invalid JSON syntax`,
        riskScore: 50
      };
    }
  }

  private validateText(content: string | Uint8Array): ValidationResult<{ riskScore: number }> {
    const text = typeof content === 'string' ? content : new TextDecoder().decode(content);

    // Use existing sanitization
    const sanitizeResult = sanitizeUserInput(text, {
      maxLength: text.length,
      allowHTML: false
    });

    if (!sanitizeResult.success) {
      return {
        success: false,
        error: sanitizeResult.error,
        riskScore: 40
      };
    }

    return {
      success: true,
      data: { riskScore: 0 }
    };
  }

  private validateWebAssembly(content: string | Uint8Array): ValidationResult<{ riskScore: number }> {
    const wasmData = typeof content === 'string' ? new TextEncoder().encode(content) : content;

    // Basic WASM magic number check
    if (wasmData.length < 8) {
      return {
        success: false,
        error: "Invalid WASM file: too small",
        riskScore: 70
      };
    }

    // Check WASM magic number (0x00, 0x61, 0x73, 0x6D)
    const magic = Array.from(wasmData.slice(0, 4));
    const expectedMagic = [0x00, 0x61, 0x73, 0x6D];

    if (!magic.every((byte, index) => byte === expectedMagic[index])) {
      return {
        success: false,
        error: "Invalid WASM file: incorrect magic number",
        riskScore: 80
      };
    }

    return {
      success: true,
      data: { riskScore: 10 } // WASM has some inherent risk
    };
  }

  private validateImage(content: string | Uint8Array): ValidationResult<{ riskScore: number }> {
    const imageData = typeof content === 'string' ? new TextEncoder().encode(content) : content;

    if (imageData.length < 10) {
      return {
        success: false,
        error: "Invalid image file: too small",
        riskScore: 60
      };
    }

    // Basic image header validation
    const headers = {
      png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      jpeg: [0xFF, 0xD8, 0xFF],
      gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      webp: [0x52, 0x49, 0x46, 0x46] // Followed by file size, then "WEBP"
    };

    let validHeader = false;
    for (const [format, header] of Object.entries(headers)) {
      if (imageData.length >= header.length) {
        const fileHeader = Array.from(imageData.slice(0, header.length));
        if (fileHeader.every((byte, index) => byte === header[index])) {
          validHeader = true;
          break;
        }
      }
    }

    if (!validHeader) {
      return {
        success: false,
        error: "Invalid image file: unrecognized format",
        riskScore: 70
      };
    }

    return {
      success: true,
      data: { riskScore: 5 } // Images have low risk
    };
  }

  private validateMedia(content: string | Uint8Array): ValidationResult<{ riskScore: number }> {
    const mediaData = typeof content === 'string' ? new TextEncoder().encode(content) : content;

    if (mediaData.length < 12) {
      return {
        success: false,
        error: "Invalid media file: too small",
        riskScore: 60
      };
    }

    // Basic media format detection would go here
    // For now, just check that it's not obviously malicious

    return {
      success: true,
      data: { riskScore: 10 } // Media files have low-moderate risk
    };
  }
}

/**
 * Create a default Blossom validator instance
 */
export function createBlossomValidator(config?: BlossomValidationConfig): BlossomContentValidator {
  return new BlossomContentValidator(config);
}

/**
 * Convenience function for quick content validation
 */
export async function quickValidateBlossomContent(
  content: string | Uint8Array | File,
  contentType?: string
): Promise<BlossomValidationResult<any>> {
  const validator = createBlossomValidator();
  return validator.validateContent(content, contentType);
}