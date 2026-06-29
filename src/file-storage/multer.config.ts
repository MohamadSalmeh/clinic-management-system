import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const uploadPath = 'uploads';

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
};