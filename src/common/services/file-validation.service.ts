import { Injectable, BadRequestException } from '@nestjs/common';

interface FastifyFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FileValidationService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  validateFile(file: FastifyFile): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier n\'a été fourni');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`Le fichier est trop volumineux. Taille maximale: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }

    // Vérification du nom de fichier
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    if (sanitizedFilename !== file.originalname) {
      throw new BadRequestException('Le nom du fichier contient des caractères non autorisés');
    }
  }

  private sanitizeFilename(filename: string): string {
    // Supprime les caractères spéciaux et les chemins relatifs
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '');
  }
} 