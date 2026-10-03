import { getDatabase } from '../config/database';

export interface User {
    id?: number;
    username: string;
    password?: string;
    created_at?: string;
}

/**
 * UserModel handles all direct database queries for the 'users' table.
 * It isolates SQL operations from controller logic to enforce the MVC pattern.
 */
export const UserModel = {
    /**
     * Find a user by their unique username.
     * @param username The username to search for.
     */
    async findByUsername(username: string): Promise<User | undefined> {
        const db = await getDatabase();
        return db.get('SELECT * FROM users WHERE username = ?', [username]);
    },

    /**
     * Find a user by their unique ID.
     * @param id The user ID.
     */
    async findById(id: number): Promise<User | undefined> {
        const db = await getDatabase();
        return db.get('SELECT * FROM users WHERE id = ?', [id]);
    },

    /**
     * Update a user's password with a new hash.
     * @param id The user ID.
     * @param passwordHash The pre-hashed password.
     */
    async updatePassword(id: number, passwordHash: string): Promise<any> {
        const db = await getDatabase();
        return db.run('UPDATE users SET password = ? WHERE id = ?', [passwordHash, id]);
    },

    /**
     * Fetch profile details (id, username, created_at) for a user.
     * Excludes security-sensitive fields like password.
     * @param id The user ID.
     */
    async getProfileById(id: number): Promise<User | undefined> {
        const db = await getDatabase();
        return db.get('SELECT id, username, created_at FROM users WHERE id = ?', [id]);
    }
};
