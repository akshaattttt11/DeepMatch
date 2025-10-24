// Local Database Service - SQLite for offline functionality
// Uses expo-sqlite for cross-platform database support

import * as SQLite from 'expo-sqlite';

class LocalDatabase {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize database and create tables
  async init() {
    try {
      // Open database
      this.db = SQLite.openDatabase('dating_app.db');
      
      // Create tables
      await this.createTables();
      
      this.isInitialized = true;
      console.log('✅ Local database initialized successfully');
    } catch (error) {
      console.error('❌ Local database initialization failed:', error);
      throw error;
    }
  }

  // Create all necessary tables
  createTables() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Users table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            email TEXT UNIQUE,
            first_name TEXT,
            last_name TEXT,
            age INTEGER,
            location TEXT,
            bio TEXT,
            mbti TEXT,
            enneagram_type INTEGER,
            love_language TEXT,
            zodiac_sign TEXT,
            profile_picture TEXT,
            gender TEXT,
            looking_for TEXT,
            min_age INTEGER,
            max_age INTEGER,
            created_at TEXT,
            updated_at TEXT
          )`,
          [],
          () => console.log('✅ Users table created'),
          (_, error) => {
            console.error('❌ Users table creation failed:', error);
            reject(error);
          }
        );

        // Matches table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY,
            user1_id INTEGER,
            user2_id INTEGER,
            matched_at TEXT,
            FOREIGN KEY (user1_id) REFERENCES users (id),
            FOREIGN KEY (user2_id) REFERENCES users (id)
          )`,
          [],
          () => console.log('✅ Matches table created'),
          (_, error) => {
            console.error('❌ Matches table creation failed:', error);
            reject(error);
          }
        );

        // Messages table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            sender_id INTEGER,
            receiver_id INTEGER,
            content TEXT,
            sent_at TEXT,
            read_at TEXT,
            FOREIGN KEY (sender_id) REFERENCES users (id),
            FOREIGN KEY (receiver_id) REFERENCES users (id)
          )`,
          [],
          () => console.log('✅ Messages table created'),
          (_, error) => {
            console.error('❌ Messages table creation failed:', error);
            reject(error);
          }
        );

        // Likes table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            liked_user_id INTEGER,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (liked_user_id) REFERENCES users (id)
          )`,
          [],
          () => console.log('✅ Likes table created'),
          (_, error) => {
            console.error('❌ Likes table creation failed:', error);
            reject(error);
          }
        );
      }, reject, resolve);
    });
  }

  // USER OPERATIONS
  async saveUser(userData) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO users (
            id, username, email, first_name, last_name, age, location, bio,
            mbti, enneagram_type, love_language, zodiac_sign, profile_picture,
            gender, looking_for, min_age, max_age, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userData.id || Date.now(),
            userData.username || '',
            userData.email || '',
            userData.first_name || '',
            userData.last_name || '',
            userData.age || null,
            userData.location || '',
            userData.bio || '',
            userData.mbti || '',
            userData.enneagram_type || null,
            userData.love_language || '',
            userData.zodiac_sign || '',
            userData.profile_picture || '',
            userData.gender || '',
            userData.looking_for || '',
            userData.min_age || 18,
            userData.max_age || 100,
            userData.created_at || now,
            now
          ],
          (_, result) => {
            console.log('✅ User saved locally:', userData.id || result.insertId);
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Failed to save user:', error);
            reject(error);
          }
        );
      });
    });
  }

  async getUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE id = ?',
          [userId],
          (_, { rows }) => {
            const user = rows.item(0);
            resolve(user || null);
          },
          (_, error) => {
            console.error('❌ Failed to get user:', error);
            reject(error);
          }
        );
      });
    });
  }

  async getUsers() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users ORDER BY created_at DESC',
          [],
          (_, { rows }) => {
            const users = [];
            for (let i = 0; i < rows.length; i++) {
              users.push(rows.item(i));
            }
            resolve(users);
          },
          (_, error) => {
            console.error('❌ Failed to get users:', error);
            reject(error);
          }
        );
      });
    });
  }

  // MATCH OPERATIONS
  async saveMatch(matchData) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO matches (id, user1_id, user2_id, matched_at)
           VALUES (?, ?, ?, ?)`,
          [
            matchData.id || Date.now(),
            matchData.user1_id,
            matchData.user2_id,
            matchData.matched_at || new Date().toISOString()
          ],
          (_, result) => {
            console.log('✅ Match saved locally:', matchData.id || result.insertId);
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Failed to save match:', error);
            reject(error);
          }
        );
      });
    });
  }

  async getMatches() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM matches ORDER BY matched_at DESC',
          [],
          (_, { rows }) => {
            const matches = [];
            for (let i = 0; i < rows.length; i++) {
              matches.push(rows.item(i));
            }
            resolve(matches);
          },
          (_, error) => {
            console.error('❌ Failed to get matches:', error);
            reject(error);
          }
        );
      });
    });
  }

  // MESSAGE OPERATIONS
  async saveMessage(messageData) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO messages (id, sender_id, receiver_id, content, sent_at, read_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            messageData.id || Date.now(),
            messageData.sender_id,
            messageData.receiver_id,
            messageData.content,
            messageData.sent_at || new Date().toISOString(),
            messageData.read_at || null
          ],
          (_, result) => {
            console.log('✅ Message saved locally:', messageData.id || result.insertId);
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Failed to save message:', error);
            reject(error);
          }
        );
      });
    });
  }

  async getMessages(matchId) {
    return new Promise((resolve, reject) => {
      // Get messages between two users in a match
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT m.* FROM messages m
           INNER JOIN matches mt ON 
             (m.sender_id = mt.user1_id AND m.receiver_id = mt.user2_id) OR
             (m.sender_id = mt.user2_id AND m.receiver_id = mt.user1_id)
           WHERE mt.id = ?
           ORDER BY m.sent_at ASC`,
          [matchId],
          (_, { rows }) => {
            const messages = [];
            for (let i = 0; i < rows.length; i++) {
              messages.push(rows.item(i));
            }
            resolve(messages);
          },
          (_, error) => {
            console.error('❌ Failed to get messages:', error);
            reject(error);
          }
        );
      });
    });
  }

  // LIKE OPERATIONS
  async saveLike(likeData) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO likes (id, user_id, liked_user_id, created_at)
           VALUES (?, ?, ?, ?)`,
          [
            likeData.id || Date.now(),
            likeData.user_id,
            likeData.liked_user_id,
            likeData.created_at || new Date().toISOString()
          ],
          (_, result) => {
            console.log('✅ Like saved locally:', likeData.id || result.insertId);
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Failed to save like:', error);
            reject(error);
          }
        );
      });
    });
  }

  async hasLiked(userId, likedUserId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT COUNT(*) as count FROM likes WHERE user_id = ? AND liked_user_id = ?',
          [userId, likedUserId],
          (_, { rows }) => {
            const result = rows.item(0);
            resolve(result.count > 0);
          },
          (_, error) => {
            console.error('❌ Failed to check like:', error);
            reject(error);
          }
        );
      });
    });
  }

  // UTILITY OPERATIONS
  async clearData() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql('DELETE FROM messages', [], () => {});
        tx.executeSql('DELETE FROM likes', [], () => {});
        tx.executeSql('DELETE FROM matches', [], () => {});
        tx.executeSql('DELETE FROM users', [], () => {
          console.log('✅ All data cleared from local database');
          resolve();
        });
      }, reject);
    });
  }

  async getDatabaseInfo() {
    return new Promise((resolve, reject) => {
      let info = { users: 0, matches: 0, messages: 0, likes: 0 };
      
      this.db.transaction(tx => {
        // Count users
        tx.executeSql('SELECT COUNT(*) as count FROM users', [], (_, { rows }) => {
          info.users = rows.item(0).count;
        });
        
        // Count matches
        tx.executeSql('SELECT COUNT(*) as count FROM matches', [], (_, { rows }) => {
          info.matches = rows.item(0).count;
        });
        
        // Count messages
        tx.executeSql('SELECT COUNT(*) as count FROM messages', [], (_, { rows }) => {
          info.messages = rows.item(0).count;
        });
        
        // Count likes
        tx.executeSql('SELECT COUNT(*) as count FROM likes', [], (_, { rows }) => {
          info.likes = rows.item(0).count;
          resolve(info);
        });
      }, reject);
    });
  }
}

// Create and export a single instance
const localDatabase = new LocalDatabase();
export default localDatabase;

// Usage example:
/*
import localDatabase from '../services/localDatabase';

// Initialize
await localDatabase.init();

// Save user
await localDatabase.saveUser({
  id: 1,
  username: 'john_doe',
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe'
});

// Get users
const users = await localDatabase.getUsers();
console.log('Local users:', users);
*/ 