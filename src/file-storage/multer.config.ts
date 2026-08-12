import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const uploadPath = 'uploads';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
]);

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

export const multerConfig = {
    storage: diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, uploadPath);
        },

        filename: (_req, file, cb) => {
            const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9);

            cb(
                null,
                uniqueSuffix + extname(file.originalname),
            );
        },
    }),

    limits: {
        fileSize: MAX_FILE_SIZE,
    },

    fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (
            error: Error | null,
            acceptFile: boolean,
        ) => void,
    ) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(
                new Error(
                    'Only PDF, JPG, JPEG, and PNG files are allowed.',
                ),
                false,
            );
        }

        cb(null, true);
    },
};