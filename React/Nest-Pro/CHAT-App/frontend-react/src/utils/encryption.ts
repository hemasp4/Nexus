/**
 * End-to-End Encryption Utility
 * Uses Web Crypto API for AES-GCM encryption and ECDH key exchange
 */

// Generate a new ECDH key pair for a user
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256'
        },
        true, // extractable
        ['deriveKey', 'deriveBits']
    );
}

// Export public key to share with other users
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', publicKey);
    return arrayBufferToBase64(exported);
}

// Import a public key from base64 string
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(base64Key);
    return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        {
            name: 'ECDH',
            namedCurve: 'P-256'
        },
        true,
        []
    );
}

// Derive a shared secret key from private key and other party's public key
export async function deriveSharedKey(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<CryptoKey> {
    return await crypto.subtle.deriveKey(
        {
            name: 'ECDH',
            public: publicKey
        },
        privateKey,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt a message using AES-GCM
export async function encryptMessage(
    message: string,
    sharedKey: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        sharedKey,
        data
    );

    return {
        encrypted: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv)
    };
}

// Decrypt a message using AES-GCM
export async function decryptMessage(
    encrypted: string,
    iv: string,
    sharedKey: CryptoKey
): Promise<string> {
    const encryptedBuffer = base64ToArrayBuffer(encrypted);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivBuffer
        },
        sharedKey,
        encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

// Export private key for storage (use with caution - should be stored securely)
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    return arrayBufferToBase64(exported);
}

// Import private key from base64
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(base64Key);
    return await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        {
            name: 'ECDH',
            namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
    );
}

// Utility: ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Utility: Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Key Management Store - stores keys in IndexedDB
const DB_NAME = 'NexusChatKeys';
const DB_VERSION = 1;
const STORE_NAME = 'encryption_keys';

async function openKeyDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Store key pair for a user
export async function storeKeyPair(userId: string, keyPair: CryptoKeyPair): Promise<void> {
    const db = await openKeyDatabase();
    const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put({
            id: `keypair_${userId}`,
            privateKey: privateKeyBase64,
            publicKey: publicKeyBase64
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Retrieve key pair for a user
export async function getKeyPair(userId: string): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey } | null> {
    const db = await openKeyDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(`keypair_${userId}`);

        request.onsuccess = async () => {
            const result = request.result;
            if (result) {
                try {
                    const privateKey = await importPrivateKey(result.privateKey);
                    const publicKey = await importPublicKey(result.publicKey);
                    resolve({ privateKey, publicKey });
                } catch (error) {
                    reject(error);
                }
            } else {
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

// Store shared key with a contact
export async function storeSharedKey(contactId: string, sharedKey: CryptoKey): Promise<void> {
    const db = await openKeyDatabase();
    const exported = await crypto.subtle.exportKey('raw', sharedKey);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put({
            id: `shared_${contactId}`,
            key: arrayBufferToBase64(exported)
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Retrieve shared key with a contact
export async function getSharedKey(contactId: string): Promise<CryptoKey | null> {
    const db = await openKeyDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(`shared_${contactId}`);

        request.onsuccess = async () => {
            const result = request.result;
            if (result) {
                try {
                    const keyBuffer = base64ToArrayBuffer(result.key);
                    const key = await crypto.subtle.importKey(
                        'raw',
                        keyBuffer,
                        { name: 'AES-GCM', length: 256 },
                        false,
                        ['encrypt', 'decrypt']
                    );
                    resolve(key);
                } catch (error) {
                    reject(error);
                }
            } else {
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

// Initialize encryption for a user (generate keys if not exist)
export async function initializeEncryption(userId: string): Promise<{ publicKey: string }> {
    let keyPair = await getKeyPair(userId);

    if (!keyPair) {
        // Generate new key pair
        const newKeyPair = await generateKeyPair();
        await storeKeyPair(userId, newKeyPair);
        keyPair = { privateKey: newKeyPair.privateKey, publicKey: newKeyPair.publicKey };
    }

    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
    return { publicKey: publicKeyBase64 };
}

// Establish secure channel with a contact
export async function establishSecureChannel(
    userId: string,
    contactId: string,
    contactPublicKeyBase64: string
): Promise<void> {
    const keyPair = await getKeyPair(userId);
    if (!keyPair) {
        throw new Error('User keys not initialized');
    }

    const contactPublicKey = await importPublicKey(contactPublicKeyBase64);
    const sharedKey = await deriveSharedKey(keyPair.privateKey, contactPublicKey);

    await storeSharedKey(contactId, sharedKey);
}

// Send encrypted message
export async function sendEncryptedMessage(
    contactId: string,
    message: string
): Promise<{ encrypted: string; iv: string } | null> {
    const sharedKey = await getSharedKey(contactId);
    if (!sharedKey) {
        console.warn('No shared key found for contact, sending unencrypted');
        return null;
    }

    return await encryptMessage(message, sharedKey);
}

// Receive encrypted message
export async function receiveEncryptedMessage(
    contactId: string,
    encrypted: string,
    iv: string
): Promise<string | null> {
    const sharedKey = await getSharedKey(contactId);
    if (!sharedKey) {
        console.warn('No shared key found for contact, cannot decrypt');
        return null;
    }

    try {
        return await decryptMessage(encrypted, iv, sharedKey);
    } catch (error) {
        console.error('Failed to decrypt message:', error);
        return null;
    }
}
