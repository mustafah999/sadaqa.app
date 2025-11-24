// --- الجزء 1 من 3: ملف server.js (تهيئة الخادم والاتصال بـ DigitalOcean Spaces) ---

const express = require('express');
const AWS = require('aws-sdk'); // نستخدم AWS SDK لأن DigitalOcean Spaces متوافقة معها
const cors = require('cors'); 
const app = express();
const PORT = process.env.PORT || 3000; // المنفذ الذي سيعمل عليه الخادم

// ⚠️ مفاتيح DigitalOcean (يتم إدخالها مباشرة في الكود لغرض العرض)
// في التطبيق الحقيقي، يجب أن تكون هذه المتغيرات محمية (بيئة إنتاج)
const SPACES_ACCESS_KEY = 'DO00QKPUQ32WP2NQFJQW';
const SPACES_SECRET_KEY = 'KTDe67mn+rN2BLPkXZ6QkeS94EzmRhZUgx6ZqO1PHAk';
const SPACES_ENDPOINT = 'https://sadaqa.reeld.sfo3.digitaloceanspaces.com';

// 1. إعداد CORS (مهم جداً!)
// يسمح لتطبيقك HTML (الواجهة الأمامية) بالاتصال بالخادم الوسيط.
app.use(cors({
    origin: '*', // السماح لأي مصدر بالاتصال (للاختبار)
    methods: ['GET'],
}));

// 2. إعداد اتصال AWS/DigitalOcean Spaces
// نستخدم الـ Endpoint ليعرف AWS SDK أنه يتحدث مع DigitalOcean وليس AWS نفسها.
const spacesEndpoint = new AWS.Endpoint(SPACES_ENDPOINT.replace('https://', ''));
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: SPACES_ACCESS_KEY,
    secretAccessKey: SPACES_SECRET_KEY,
});

// اسم مستودع Spaces (يجب استخلاصه من الرابط: sadaqa.reeld)
const bucketName = 'sadaqa.reeld'; 


// 3. دالة الجلب والفرز الرئيسية (سيتم تعبئتها في الجزء 2)
async function getVideosList() {
    console.log('Fetching objects from Spaces...');
    
    // إعدادات لطلب قائمة الملفات من Spaces
    const params = {
        Bucket: bucketName,
        // يمكن إضافة فلترة هنا للبحث عن ملفات .mp4 فقط
    };
    
    try {
        const data = await s3.listObjectsV2(params).promise();

        // ⚠️ مهمتنا في الجزء 2 هي تحويل البيانات الخام (data.Contents)
        // إلى قائمة مرتبة زمنياً ونظيفة (Videos List)

        // سنفترض مؤقتاً أننا أرجعنا البيانات الخام:
        const rawList = data.Contents || [];

        // ⚠️ سنقوم بالفلترة والفرز في الجزء 2
        return rawList
            .filter(item => item.Key.endsWith('.mp4')) // فلترة ملفات MP4 فقط
            .map(item => ({
                id: item.ETag.replace(/"/g, ''), // استخدام الـ ETag كـ ID فريد
                title: item.Key.replace('.mp4', ''),
                url: `https://${bucketName}.${spacesEndpoint.host}/${item.Key}`,
                date: item.LastModified,
                thumbnail: null, // سيتم توليده في الجزء 2
            }))
            // ترتيب تنازلي (الأحدث أولاً)
            .sort((a, b) => b.date - a.date);

    } catch (err) {
        console.error("Error fetching data from Spaces:", err);
        return { error: 'Failed to fetch videos from storage.' };
    }
}


// 4. نقطة النهاية (Endpoint) لتطبيق HTML الخاص بك
app.get('/api/videos', async (req, res) => {
    const videoData = await getVideosList();
    if (videoData.error) {
        return res.status(500).json(videoData);
    }
    // هنا سنرسل القائمة المرتبة والنظيفة لتطبيق HTML
    res.json({ success: true, videos: videoData });
});


// 5. بدء تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

