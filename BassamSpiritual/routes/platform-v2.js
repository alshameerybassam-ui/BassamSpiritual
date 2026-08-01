const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function createPlatformV2({ pool, authenticateToken, requireAdmin, sendPushNotification }) {
  const router = express.Router();

  const APP_BASE_URL = process.env.APP_BASE_URL || 'https://bassam-spiritual-center.onrender.com';
  const JWT_SECRET = process.env.JWT_SECRET;
  const TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '24h';

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required for Platform V2');
  }

  function safePublicUser(row) {
    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone || '',
      role: row.role
    };
  }

  function hashToken(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  function makeToken(payload, expiresIn = TOKEN_TTL) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  async function initSchema() {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key VARCHAR(120) PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        icon VARCHAR(120) DEFAULT 'bi-heart',
        price NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'YER',
        duration_minutes INTEGER,
        active BOOLEAN DEFAULT TRUE,
        featured BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        starts_at TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        mode VARCHAR(30) NOT NULL DEFAULT 'live',
        access VARCHAR(30) NOT NULL DEFAULT 'public',
        price NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'YER',
        live_url TEXT DEFAULT '',
        recording_url TEXT DEFAULT '',
        cover_url TEXT DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
        max_attendees INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS session_topics (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        vote_count INTEGER DEFAULT 0,
        selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS session_votes (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER REFERENCES session_topics(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        visitor_key VARCHAR(180),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_session_vote_user
        ON session_votes(topic_id, user_id)
        WHERE user_id IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_session_vote_visitor
        ON session_votes(topic_id, visitor_key)
        WHERE visitor_key IS NOT NULL;

      CREATE TABLE IF NOT EXISTS session_attendees (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS media_files (
        id BIGSERIAL PRIMARY KEY,
        owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
        kind VARCHAR(40) NOT NULL DEFAULT 'audio',
        mime_type VARCHAR(120) NOT NULL,
        file_name VARCHAR(255) DEFAULT '',
        bytes BYTEA NOT NULL,
        transcript TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens_v2 (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_verification_tokens_v2 (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs_v2 (
        id BIGSERIAL PRIMARY KEY,
        actor_user_id INTEGER,
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(80),
        entity_id VARCHAR(120),
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const defaults = {
      site_name: 'مركز النور الرباني والنَفَس الرحماني',
      site_subtitle: 'لإعادة اتزان الروح والنفس والجسد',
      hero_badge: 'مساحة آمنة للإنصات والتوجيه والخدمة',
      hero_title: 'ابدأ بخطوتك الأولى نحو الطمأنينة',
      hero_description: 'لا تحتاج إلى معرفة كيف تصف ما تمر به. تحدث بهدوء، وتعرّف على الطريق المناسب لك.',
      primary_color: '#F5B041',
      secondary_color: '#0A1628',
      accent_color: '#E67E22',
      show_sessions: true,
      show_articles: true,
      show_reviews: true,
      show_stats: true
    };

    for (const [key, value] of Object.entries(defaults)) {
      await pool.query(
        `INSERT INTO platform_settings (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value)]
      );
    }
  }

  // Initialize without blocking registration of routes.
  initSchema().catch(err => console.error('❌ Platform V2 schema:', err.message));

  async function audit(req, action, entityType = null, entityId = null, details = {}) {
    try {
      await pool.query(
        `INSERT INTO audit_logs_v2 (actor_user_id, action, entity_type, entity_id, details)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [req.user?.id || null, action, entityType, entityId ? String(entityId) : null, JSON.stringify(details)]
      );
    } catch (_) {}
  }

  // ---------- Health ----------
  router.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ success: true, database: true, time: new Date().toISOString() });
    } catch (e) {
      res.status(503).json({ success: false, database: false, error: 'قاعدة البيانات غير متاحة' });
    }
  });

  // ---------- Settings ----------
  router.get('/settings', async (_req, res) => {
    const result = await pool.query(`SELECT key, value FROM platform_settings ORDER BY key`);
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json({ success: true, settings });
  });

  router.put('/admin/settings/:key', authenticateToken, requireAdmin, async (req, res) => {
    const { key } = req.params;
    const allowed = new Set([
      'site_name','site_subtitle','hero_badge','hero_title','hero_description',
      'primary_color','secondary_color','accent_color',
      'show_sessions','show_articles','show_reviews','show_stats'
    ]);
    if (!allowed.has(key)) return res.status(400).json({ error: 'إعداد غير مسموح.' });
    await pool.query(
      `INSERT INTO platform_settings (key,value,updated_at)
       VALUES ($1,$2::jsonb,CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP`,
      [key, JSON.stringify(req.body.value)]
    );
    await audit(req, 'settings.update', 'setting', key, { value: req.body.value });
    res.json({ success: true });
  });

  // ---------- Services ----------
  router.get('/services', async (_req, res) => {
    const r = await pool.query(
      `SELECT id,title,description,icon,price,currency,duration_minutes AS "durationMinutes",
              active,featured,sort_order AS "sortOrder",fields,created_at AS "createdAt"
       FROM services WHERE active=true ORDER BY featured DESC, sort_order ASC, id ASC`
    );
    res.json({ success: true, services: r.rows });
  });

  router.get('/admin/services', authenticateToken, requireAdmin, async (_req, res) => {
    const r = await pool.query(
      `SELECT id,title,description,icon,price,currency,duration_minutes AS "durationMinutes",
              active,featured,sort_order AS "sortOrder",fields,created_at AS "createdAt"
       FROM services ORDER BY sort_order ASC, id ASC`
    );
    res.json({ success: true, services: r.rows });
  });

  router.post('/admin/services', authenticateToken, requireAdmin, async (req, res) => {
    const {
      title, description = '', icon = 'bi-heart', price = null, currency = 'YER',
      durationMinutes = null, active = true, featured = false, sortOrder = 0, fields = []
    } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'اسم الخدمة مطلوب.' });

    const r = await pool.query(
      `INSERT INTO services
       (title,description,icon,price,currency,duration_minutes,active,featured,sort_order,fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id`,
      [title.trim(), description, icon, price, currency, durationMinutes, !!active, !!featured, sortOrder, JSON.stringify(fields)]
    );
    await audit(req, 'service.create', 'service', r.rows[0].id, { title });
    res.json({ success: true, id: r.rows[0].id });
  });

  router.put('/admin/services/:id', authenticateToken, requireAdmin, async (req, res) => {
    const {
      title, description = '', icon = 'bi-heart', price = null, currency = 'YER',
      durationMinutes = null, active = true, featured = false, sortOrder = 0, fields = []
    } = req.body;
    await pool.query(
      `UPDATE services
       SET title=$1,description=$2,icon=$3,price=$4,currency=$5,duration_minutes=$6,
           active=$7,featured=$8,sort_order=$9,fields=$10::jsonb,updated_at=CURRENT_TIMESTAMP
       WHERE id=$11`,
      [title, description, icon, price, currency, durationMinutes, !!active, !!featured, sortOrder, JSON.stringify(fields), req.params.id]
    );
    await audit(req, 'service.update', 'service', req.params.id, { title });
    res.json({ success: true });
  });

  router.delete('/admin/services/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM services WHERE id=$1`, [req.params.id]);
    await audit(req, 'service.delete', 'service', req.params.id);
    res.json({ success: true });
  });

  // ---------- Sessions ----------
  router.get('/sessions', async (_req, res) => {
    const r = await pool.query(`
      SELECT id,title,description,starts_at AS "startsAt",duration_minutes AS "durationMinutes",
             mode,access,price,currency,live_url AS "liveUrl",recording_url AS "recordingUrl",
             cover_url AS "coverUrl",status,max_attendees AS "maxAttendees"
      FROM sessions
      WHERE status <> 'cancelled'
      ORDER BY starts_at DESC
      LIMIT 50
    `);
    const topics = await pool.query(`
      SELECT id,session_id AS "sessionId",title,description,vote_count AS "voteCount",selected
      FROM session_topics
      ORDER BY id ASC
    `);
    const bySession = {};
    for (const t of topics.rows) (bySession[t.sessionId] ||= []).push(t);
    res.json({ success: true, sessions: r.rows.map(s => ({ ...s, topics: bySession[s.id] || [] })) });
  });

  router.get('/admin/sessions', authenticateToken, requireAdmin, async (_req, res) => {
    const r = await pool.query(`
      SELECT id,title,description,starts_at AS "startsAt",duration_minutes AS "durationMinutes",
             mode,access,price,currency,live_url AS "liveUrl",recording_url AS "recordingUrl",
             cover_url AS "coverUrl",status,max_attendees AS "maxAttendees"
      FROM sessions ORDER BY starts_at DESC
    `);
    const t = await pool.query(`
      SELECT id,session_id AS "sessionId",title,description,vote_count AS "voteCount",selected
      FROM session_topics ORDER BY id ASC
    `);
    const bySession = {};
    for (const topic of t.rows) (bySession[topic.sessionId] ||= []).push(topic);
    res.json({ success: true, sessions: r.rows.map(s => ({ ...s, topics: bySession[s.id] || [] })) });
  });

  router.post('/admin/sessions', authenticateToken, requireAdmin, async (req, res) => {
    const {
      title, description = '', startsAt, durationMinutes = 60,
      mode = 'live', access = 'public', price = null, currency = 'YER',
      liveUrl = '', recordingUrl = '', coverUrl = '', status = 'scheduled', maxAttendees = null
    } = req.body;
    if (!title?.trim() || !startsAt) return res.status(400).json({ error: 'العنوان والموعد مطلوبان.' });
    const r = await pool.query(
      `INSERT INTO sessions
       (title,description,starts_at,duration_minutes,mode,access,price,currency,live_url,recording_url,cover_url,status,max_attendees)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [title.trim(), description, startsAt, durationMinutes, mode, access, price, currency, liveUrl, recordingUrl, coverUrl, status, maxAttendees]
    );
    await audit(req, 'session.create', 'session', r.rows[0].id, { title });
    res.json({ success: true, id: r.rows[0].id });
  });

  router.put('/admin/sessions/:id', authenticateToken, requireAdmin, async (req, res) => {
    const {
      title, description = '', startsAt, durationMinutes = 60,
      mode = 'live', access = 'public', price = null, currency = 'YER',
      liveUrl = '', recordingUrl = '', coverUrl = '', status = 'scheduled', maxAttendees = null
    } = req.body;
    await pool.query(
      `UPDATE sessions SET title=$1,description=$2,starts_at=$3,duration_minutes=$4,mode=$5,access=$6,
       price=$7,currency=$8,live_url=$9,recording_url=$10,cover_url=$11,status=$12,max_attendees=$13,
       updated_at=CURRENT_TIMESTAMP WHERE id=$14`,
      [title, description, startsAt, durationMinutes, mode, access, price, currency, liveUrl, recordingUrl, coverUrl, status, maxAttendees, req.params.id]
    );
    await audit(req, 'session.update', 'session', req.params.id, { title });
    res.json({ success: true });
  });

  router.delete('/admin/sessions/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM sessions WHERE id=$1`, [req.params.id]);
    await audit(req, 'session.delete', 'session', req.params.id);
    res.json({ success: true });
  });

  router.post('/admin/sessions/:id/topics', authenticateToken, requireAdmin, async (req, res) => {
    if (!req.body.title?.trim()) return res.status(400).json({ error: 'عنوان الموضوع مطلوب.' });
    const r = await pool.query(
      `INSERT INTO session_topics (session_id,title,description) VALUES ($1,$2,$3) RETURNING id`,
      [req.params.id, req.body.title.trim(), req.body.description || '']
    );
    await audit(req, 'session.topic.create', 'session_topic', r.rows[0].id, { sessionId: req.params.id });
    res.json({ success: true, id: r.rows[0].id });
  });

  router.put('/admin/topics/:id/select', authenticateToken, requireAdmin, async (req, res) => {
    const row = await pool.query(`SELECT session_id FROM session_topics WHERE id=$1`, [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: 'الموضوع غير موجود.' });
    const sessionId = row.rows[0].session_id;
    await pool.query(`UPDATE session_topics SET selected=false WHERE session_id=$1`, [sessionId]);
    await pool.query(`UPDATE session_topics SET selected=true WHERE id=$1`, [req.params.id]);
    await audit(req, 'session.topic.select', 'session_topic', req.params.id);
    res.json({ success: true });
  });

  router.delete('/admin/topics/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM session_topics WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  });

  router.post('/sessions/:id/vote', async (req, res) => {
    const topicId = Number(req.body.topicId);
    if (!topicId) return res.status(400).json({ error: 'الموضوع مطلوب.' });
    const session = await pool.query(`SELECT id,status FROM sessions WHERE id=$1`, [req.params.id]);
    if (!session.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة.' });

    const visitorKey = String(req.headers['x-visitor-key'] || '').slice(0, 180);
    let userId = null;
    const auth = req.headers.authorization?.split(' ')[1];
    if (auth) {
      try { userId = jwt.verify(auth, JWT_SECRET).id || null; } catch (_) {}
    }

    try {
      await pool.query(
        `INSERT INTO session_votes (topic_id,user_id,visitor_key) VALUES ($1,$2,$3)`,
        [topicId, userId, userId ? null : (visitorKey || null)]
      );
      await pool.query(`UPDATE session_topics SET vote_count=vote_count+1 WHERE id=$1`, [topicId]);
      res.json({ success: true });
    } catch (e) {
      return res.status(409).json({ error: 'تم تسجيل تصويتك مسبقاً لهذا الموضوع.' });
    }
  });

  router.post('/sessions/:id/attend', authenticateToken, async (req, res) => {
    const sessionId = Number(req.params.id);
    const info = await pool.query(`SELECT access,max_attendees FROM sessions WHERE id=$1`, [sessionId]);
    if (!info.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة.' });
    if (info.rows[0].access === 'public' || info.rows[0].access === 'registered' || info.rows[0].access === 'subscribers') {
      if (info.rows[0].max_attendees) {
        const c = await pool.query(`SELECT COUNT(*) FROM session_attendees WHERE session_id=$1`, [sessionId]);
        if (Number(c.rows[0].count) >= info.rows[0].max_attendees) return res.status(409).json({ error: 'اكتمل العدد.' });
      }
      await pool.query(
        `INSERT INTO session_attendees (session_id,user_id) VALUES ($1,$2)
         ON CONFLICT (session_id,user_id) DO NOTHING`,
        [sessionId, req.user.id]
      );
      res.json({ success: true });
    } else {
      res.status(403).json({ error: 'الحجز غير متاح.' });
    }
  });

  // ---------- Protected media: small/short voice clips can be stored in PostgreSQL ----------
  router.post('/media/audio', authenticateToken, async (req, res) => {
    const { requestId = null, fileName = 'voice.webm', mimeType = 'audio/webm', base64, transcript = '' } = req.body;
    if (!base64) return res.status(400).json({ error: 'الملف الصوتي مفقود.' });
    const raw = String(base64).split(',').pop();
    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'ملف صوتي غير صالح.' });
    const maxBytes = 5 * 1024 * 1024;
    if (buffer.length > maxBytes) return res.status(413).json({ error: 'الملف أكبر من 5 ميجابايت.' });

    if (requestId) {
      const owner = await pool.query(`SELECT user_id FROM requests WHERE id=$1`, [requestId]);
      if (!owner.rows.length) return res.status(404).json({ error: 'الطلب غير موجود.' });
      if (req.user.role !== 'admin' && Number(owner.rows[0].user_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'غير مصرح.' });
      }
    }

    const r = await pool.query(
      `INSERT INTO media_files (owner_user_id,request_id,kind,mime_type,file_name,bytes,transcript)
       VALUES ($1,$2,'audio',$3,$4,$5,$6) RETURNING id,created_at AS "createdAt"`,
      [req.user.id, requestId, mimeType, fileName, buffer, transcript]
    );
    res.json({ success: true, media: r.rows[0] });
  });

  router.get('/media/:id', authenticateToken, async (req, res) => {
    const r = await pool.query(
      `SELECT owner_user_id AS "ownerUserId",request_id AS "requestId",kind,mime_type AS "mimeType",
              file_name AS "fileName",bytes,transcript
       FROM media_files WHERE id=$1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).end();
    const media = r.rows[0];
    let allowed = req.user.role === 'admin' || Number(media.ownerUserId) === Number(req.user.id);
    if (!allowed && media.requestId) {
      const q = await pool.query(`SELECT user_id FROM requests WHERE id=$1`, [media.requestId]);
      allowed = q.rows.length && Number(q.rows[0].user_id) === Number(req.user.id);
    }
    if (!allowed) return res.status(403).end();
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(media.fileName || 'audio.webm')}"`);
    res.send(media.bytes);
  });

  // ---------- Audit ----------
  router.get('/admin/audit', authenticateToken, requireAdmin, async (_req, res) => {
    const r = await pool.query(
      `SELECT id,actor_user_id AS "actorUserId",action,entity_type AS "entityType",entity_id AS "entityId",
              details,created_at AS "createdAt"
       FROM audit_logs_v2 ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ success: true, logs: r.rows });
  });

  // ---------- Dashboard summary ----------
  router.get('/admin/summary', authenticateToken, requireAdmin, async (_req, res) => {
    const q = async sql => (await pool.query(sql)).rows[0].count;
    const summary = {
      users: Number(await q(`SELECT COUNT(*) FROM users`)),
      requests: Number(await q(`SELECT COUNT(*) FROM requests`)),
      pendingRequests: Number(await q(`SELECT COUNT(*) FROM requests WHERE status='pending'`)),
      sessions: Number(await q(`SELECT COUNT(*) FROM sessions WHERE status <> 'cancelled'`)),
      services: Number(await q(`SELECT COUNT(*) FROM services WHERE active=true`)),
      reviews: Number(await q(`SELECT COUNT(*) FROM reviews WHERE isapproved=true`))
    };
    res.json({ success: true, summary });
  });

  // ---------- V2 auth ----------
  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان.' });
    const r = await pool.query(`SELECT * FROM users WHERE LOWER(email)=LOWER($1)`, [email.trim()]);
    if (!r.rows.length || !bcrypt.compareSync(password, r.rows[0].password)) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
    }
    const user = r.rows[0];
    if (user.role !== 'admin' && user.email_verified === false) {
      return res.status(403).json({ error: 'يرجى تأكيد بريدك الإلكتروني أولاً.' });
    }
    const token = makeToken({ id:user.id, email:user.email, role:user.role, full_name:user.full_name });
    res.json({ success: true, token, user: safePublicUser(user) });
  });

  router.post('/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبة.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' });

    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, [email.trim()]);
    if (existing.rows.length) return res.status(409).json({ error: 'هذا البريد مسجل مسبقاً.' });

    const hash = bcrypt.hashSync(password, 12);
    const created = await pool.query(
      `INSERT INTO users (full_name,email,password,phone,role,email_verified) VALUES ($1,$2,$3,$4,'user',false) RETURNING *`,
      [fullName.trim(), email.trim().toLowerCase(), hash, phone || null]
    );
    const user = created.rows[0];

    // Verification token is stored, while SMTP can be enabled later.
    const rawToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO email_verification_tokens_v2 (user_id,token_hash,expires_at)
       VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
      [user.id, hashToken(rawToken)]
    );

    const verifyUrl = `${APP_BASE_URL}/verify-email-v2.html?token=${rawToken}`;
    if (process.env.SMTP_HOST) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || 'false') === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'تأكيد بريدك الإلكتروني — مركز النور الرباني',
          text: `مرحباً ${user.full_name}\nلتأكيد بريدك افتح الرابط:\n${verifyUrl}`
        });
      } catch (e) {
        console.warn('⚠️ فشل إرسال التحقق بالبريد:', e.message);
      }
    }
    res.json({ success: true, requiresVerification: !!process.env.SMTP_HOST, verifyUrl: process.env.NODE_ENV === 'production' ? undefined : verifyUrl });
  });

  router.post('/auth/verify-email', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'الرمز مفقود.' });
    const r = await pool.query(
      `SELECT id,user_id FROM email_verification_tokens_v2
       WHERE token_hash=$1 AND used=false AND expires_at>CURRENT_TIMESTAMP
       ORDER BY id DESC LIMIT 1`,
      [hashToken(token)]
    );
    if (!r.rows.length) return res.status(400).json({ error: 'الرابط غير صالح أو منتهي.' });
    await pool.query(`UPDATE email_verification_tokens_v2 SET used=true WHERE id=$1`, [r.rows[0].id]);
    await pool.query(`UPDATE users SET email_verified=true WHERE id=$1`, [r.rows[0].user_id]);
    res.json({ success: true, message: 'تم تأكيد البريد الإلكتروني.' });
  });

  router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب.' });
    const r = await pool.query(`SELECT id,full_name,email FROM users WHERE LOWER(email)=LOWER($1)`, [email.trim()]);
    // Always generic response.
    if (!r.rows.length) return res.json({ success: true, message: 'إذا كان البريد مسجلاً فسيصل رابط إعادة التعيين.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO password_reset_tokens_v2 (user_id,token_hash,expires_at)
       VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '30 minutes')`,
      [r.rows[0].id, hashToken(rawToken)]
    );
    const resetUrl = `${APP_BASE_URL}/reset-password-v2.html?token=${rawToken}`;

    if (process.env.SMTP_HOST) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || 'false') === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: r.rows[0].email,
          subject: 'إعادة تعيين كلمة المرور — مركز النور الرباني',
          text: `مرحباً ${r.rows[0].full_name}\nلإعادة تعيين كلمة المرور افتح الرابط:\n${resetUrl}`
        });
      } catch (e) {
        console.warn('⚠️ فشل إرسال إعادة التعيين:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'إذا كان البريد مسجلاً فسيصل رابط إعادة التعيين.',
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl
    });
  });

  router.post('/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'البيانات ناقصة.' });
    if (String(newPassword).length < 8) return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' });

    const r = await pool.query(
      `SELECT id,user_id FROM password_reset_tokens_v2
       WHERE token_hash=$1 AND used=false AND expires_at>CURRENT_TIMESTAMP
       ORDER BY id DESC LIMIT 1`,
      [hashToken(token)]
    );
    if (!r.rows.length) return res.status(400).json({ error: 'الرابط غير صالح أو منتهي.' });

    await pool.query(`UPDATE users SET password=$1 WHERE id=$2`, [bcrypt.hashSync(newPassword,12), r.rows[0].user_id]);
    await pool.query(`UPDATE password_reset_tokens_v2 SET used=true WHERE id=$1`, [r.rows[0].id]);
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح.' });
  });

  return router;
};
