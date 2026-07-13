// مسارات المقالات (للإدارة)
app.post('/api/admin/articles', verifyToken, verifyAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    try {
        const result = await pool.query('INSERT INTO articles (title, summary, content) VALUES ($1, $2, $3) RETURNING *', [title, summary, content]);
        res.json({ success: true, article: result.rows[0] });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ في حفظ المقال.' }); }
});

app.put('/api/admin/articles/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    try {
        await pool.query('UPDATE articles SET title = $1, summary = $2, content = $3 WHERE id = $4', [title, summary, content, req.params.id]);
        res.json({ success: true, message: 'تم تحديث المقال.' });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ في تحديث المقال.' }); }
});

app.delete('/api/admin/articles/:id', verifyToken, verifyAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, error: 'خطأ.' }); }
});

// مسارات المراجعات
app.put('/api/admin/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { is_approved } = req.body;
    try { await pool.query('UPDATE reviews SET is_approved = $1 WHERE id = $2', [is_approved, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/admin/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

// مسارات توجيه الذكاء الاصطناعي
app.get('/api/admin/ai-instructions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_prompt'");
        res.json({ success: true, instructions: result.rows[0]?.value || '' });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.put('/api/admin/ai-instructions', verifyToken, verifyAdmin, async (req, res) => {
    const { instructions } = req.body;
    try {
        await pool.query("INSERT INTO system_settings (key, value) VALUES ('ai_prompt', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [instructions]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
