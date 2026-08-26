/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'lumina_media_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

export interface StoredMediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  savedAt: string;
}

class MediaStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open failed', event);
        reject(new Error('IndexedDB could not be opened'));
      };
    });

    return this.dbPromise;
  }

  public async saveMediaBlob(id: string, file: Blob | File, name: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const item: StoredMediaFile = {
          id,
          name,
          type: file.type || 'video/mp4',
          size: file.size,
          blob: file,
          savedAt: new Date().toISOString(),
        };
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Could not persist media blob to IndexedDB', err);
    }
  }

  public async getMediaBlob(id: string): Promise<StoredMediaFile | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  public async deleteMediaBlob(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Failed to delete media blob from IndexedDB', err);
    }
  }

  public async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Failed to clear IndexedDB', err);
    }
  }
}

export const mediaStorage = new MediaStorageService();
