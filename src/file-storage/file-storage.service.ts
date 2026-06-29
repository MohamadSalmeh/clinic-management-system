import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService {

    async saveFile(
        file: Express.Multer.File,
        folder: string,
    ): Promise<string> {

        const uploadDir = path.join('uploads', folder);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const destination = path.join(uploadDir, file.filename);

        fs.renameSync(file.path, destination);

        return destination.replace(/\\/g, '/');
    }

    async deleteFile(filePath: string): Promise<void> {

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    fileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }
}