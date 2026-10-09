// =========================================================
// exceptions.js — классы исключений приложения
// ⚠️ Подключается ПЕРВЫМ — до всех остальных модулей
// =========================================================

class AppError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'AppError';
        this.code = code;
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

class StorageError extends AppError {
    constructor(message) {
        super(message, 'STORAGE_ERROR');
        this.name = 'StorageError';
    }
}

class AuthError extends AppError {
    constructor(message) {
        super(message, 'AUTH_ERROR');
        this.name = 'AuthError';
    }
}

class DataError extends AppError {
    constructor(message) {
        super(message, 'DATA_ERROR');
        this.name = 'DataError';
    }
}