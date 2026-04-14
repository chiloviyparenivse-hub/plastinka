const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dorozhnaya_plastinka_db',
  user: 'postgres',
  password: '1234' // Замени на свой пароль к БД
});

async function updateAdminPassword() {
  try {
    // Хешируем пароль admin123
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    
    console.log('🔑 Новый хеш пароля:', hash);
    
    // Обновляем пароль админа
    const result = await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE username = $2 RETURNING *',
      [hash, 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Пароль админа успешно обновлен!');
      console.log('📋 Данные админа:');
      console.log('ID:', result.rows[0].id);
      console.log('Логин:', result.rows[0].username);
      console.log('Новый пароль: admin123');
    } else {
      console.log('❌ Админ не найден');
    }
    
  } catch (err) {
    console.error('❌ Ошибка при обновлении пароля:', err);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();