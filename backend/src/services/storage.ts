// services/storage.service.ts
import { BlobServiceClient } from '@azure/storage-blob';
import { createClient } from '@supabase/supabase-js';

interface IStorageProvider {
  uploadFile(file: Express.Multer.File, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}

// 1. Azure Implementation
class AzureProvider implements IStorageProvider {
  private client = BlobServiceClient.fromConnectionString(process.env.AZURE_CONNECTION_STRING!);
  private containerName = "event-uploads";

  async uploadFile(file: Express.Multer.File, path: string) {
    const containerClient = this.client.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(path);
    await blockBlobClient.uploadData(file.buffer);
    return blockBlobClient.url;
  }

  async deleteFile(path: string) {
    const containerClient = this.client.getContainerClient(this.containerName);
    await containerClient.deleteBlob(path);
  }
}

// 2. Supabase Implementation
class SupabaseProvider implements IStorageProvider {
  private client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  async uploadFile(file: Express.Multer.File, path: string) {
    const { data, error } = await this.client.storage
      .from('uploads')
      .upload(path, file.buffer);
    if (error) throw error;
    return data.path;
  }

  async deleteFile(path: string) {
    await this.client.storage.from('uploads').remove([path]);
  }
}

// 3. The Factory (Switching Logic)
export const StorageService: IStorageProvider = 
  process.env.STORAGE_PROVIDER === 'AZURE' 
    ? new AzureProvider() 
    : new SupabaseProvider();