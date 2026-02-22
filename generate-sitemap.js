import { writeFileSync } from 'fs';
import { Schema, model, connect } from 'mongoose';
import process from 'process';
import dotenv from 'dotenv';

dotenv.config();

// DATABASE CONNECTION
const MONGO_URI = process.env.VITE_moogodb_URL;
if (!MONGO_URI) {
  console.error("MongoDB URI missing in .env file");
  process.exit(1);
} 
const BASE_URL = "https://hairstyleshub.in";

// Schema (तुझ्या DB स्ट्रक्चरनुसार चेक कर)
const HaircutSchema = new Schema({
  _id: Schema.Types.ObjectId,
  // जर तू नाव किंवा स्लग वापरत असशील तर ते इथे ॲड कर
});

const Haircut = model('Haircut', HaircutSchema, 'haircuts'); // 'haircuts' हे कलेक्शन नाव आहे

async function generate() {
  try {
    await connect(MONGO_URI);
    const data = await Haircut.find({});

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><priority>1.0</priority></url>
  <url><loc>${BASE_URL}/categories</loc><priority>0.8</priority></url>
`;

    data.forEach(item => {
      xml += `  <url>
    <loc>${BASE_URL}/haircut/${item._id}</loc>
    <priority>0.7</priority>
  </url>\n`;
    });

    xml += `</urlset>`;
    writeFileSync('./public/sitemap.xml', xml);
    console.log(`✅ Success: ${data.length} haircuts added to sitemap!`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
generate();