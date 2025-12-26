import { initializeApp }  from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
};

const BUSINESS_ID = 'ytrEr0KWRkhIL0285YY0';
const BRANCH_ID = '0wUcZTkLmuMoOrWvNGFO';

// ==================== PRODUCT DATA LIST (214 ITEMS) ====================
const rawProducts = [
  { category: "LCD", model: "A50/A30 ORG", qty: 1 }, { category: "LCD", model: "A51 ORG", qty: 1 },
  { category: "LCD", model: "A30S ORG", qty: 1 }, { category: "LCD", model: "A31 ORG", qty: 1 },
  { category: "LCD", model: "A32 4G ORG", qty: 1 }, { category: "LCD", model: "A20 ORG", qty: 1 },
  { category: "LCD", model: "A20S", qty: 1 }, { category: "LCD", model: "A21", qty: 1 },
  { category: "LCD", model: "A21S", qty: 1 }, { category: "LCD", model: "A22", qty: 1 },
  { category: "LCD", model: "A23", qty: 1 }, { category: "LCD", model: "A24 ORG", qty: 1 },
  { category: "LCD", model: "A10", qty: 2 }, { category: "LCD", model: "A10S", qty: 2 },
  { category: "LCD", model: "A10E", qty: 1 }, { category: "LCD", model: "A11, M11", qty: 1 },
  { category: "LCD", model: "A12, M02, A02", qty: 2 }, { category: "LCD", model: "A13", qty: 1 },
  { category: "LCD", model: "A750", qty: 1 }, { category: "LCD", model: "A720", qty: 1 },
  { category: "LCD", model: "A6/J6 ORG", qty: 1 }, { category: "LCD", model: "A6+ ORG", qty: 1 },
  { category: "LCD", model: "A500 ORG", qty: 1 }, { category: "LCD", model: "A520 ORG", qty: 1 },
  { category: "LCD", model: "A04S", qty: 1 }, { category: "LCD", model: "A04E", qty: 1 },
  { category: "LCD", model: "A03, A03s, A02s", qty: 1 }, { category: "LCD", model: "A03core", qty: 1 },
  { category: "LCD", model: "A01core", qty: 1 }, { category: "LCD", model: "A01", qty: 1 },
  { category: "LCD", model: "A05", qty: 1 }, { category: "LCD", model: "A50 A30", qty: 1 },
  { category: "LCD", model: "A750", qty: 1 }, { category: "LCD", model: "A32", qty: 1 },
  { category: "LCD", model: "A20", qty: 1 }, { category: "LCD", model: "A600 J600", qty: 1 },
  { category: "LCD", model: "A6+", qty: 1 }, { category: "LCD", model: "A500", qty: 1 },
  { category: "LCD", model: "A520", qty: 1 }, { category: "LCD", model: "A530", qty: 1 },
  { category: "LCD", model: "J730", qty: 1 }, { category: "LCD", model: "J530", qty: 2 },
  { category: "LCD", model: "J500 J300", qty: 2 }, { category: "LCD", model: "J250", qty: 1 },
  { category: "LCD", model: "J200", qty: 1 }, { category: "LCD", model: "J110", qty: 2 },
  { category: "LCD", model: "J330", qty: 1 }, { category: "LCD", model: "J810", qty: 1 },
  { category: "LCD", model: "J610 J415", qty: 1 }, { category: "LCD", model: "J 730 ORG", qty: 2 },
  { category: "LCD", model: "J530 ORG", qty: 2 }, { category: "LCD", model: "J260", qty: 1 },
  { category: "LCD", model: "G610", qty: 1 }, { category: "LCD", model: "G570", qty: 1 },
  { category: "LCD", model: "M30 M31", qty: 1 }, { category: "LCD", model: "M20", qty: 1 },
  { category: "LCD", model: "X", qty: 5 }, { category: "LCD", model: "XR", qty: 1 },
  { category: "LCD", model: "X11", qty: 1 }, { category: "LCD", model: "X11, X 12pro", qty: 1 },
  { category: "LCD", model: "XSMAX", qty: 1 }, { category: "LCD", model: "8 +", qty: 2 },
  { category: "LCD", model: "8G", qty: 2 }, { category: "LCD", model: "7+", qty: 2 },
  { category: "LCD", model: "7G", qty: 2 }, { category: "LCD", model: "6+", qty: 2 },
  { category: "LCD", model: "6S", qty: 2 }, { category: "LCD", model: "6G", qty: 2 },
  { category: "LCD", model: "5 G", qty: 1 }, { category: "LCD", model: "5S", qty: 1 },
  { category: "LCD", model: "Z 21", qty: 1 }, { category: "LCD", model: "X Z 2", qty: 1 },
  { category: "LCD", model: "X Z1", qty: 1 }, { category: "LCD", model: "X Z", qty: 1 },
  { category: "LCD", model: "C1", qty: 1 }, { category: "LCD", model: "C10, C20", qty: 1 },
  { category: "LCD", model: "N 1. 4", qty: 1 }, { category: "LCD", model: "S 5", qty: 1 },
  { category: "LCD", model: "9A 9C", qty: 1 }, { category: "LCD", model: "C15 A11", qty: 1 },
  { category: "LCD", model: "AB7", qty: 1 }, { category: "LCD", model: "X6517/A6O", qty: 4 },
  { category: "LCD", model: "KG5/X665", qty: 3 }, { category: "LCD", model: "KD7", qty: 5 },
  { category: "LCD", model: "KD6/LC7", qty: 1 }, { category: "LCD", model: "X683/CE7", qty: 1 },
  { category: "LCD", model: "X657/KE5", qty: 5 }, { category: "LCD", model: "X650/KC8", qty: 5 },
  { category: "LCD", model: "KF6/BD3", qty: 5 }, { category: "LCD", model: "X6816/X6835", qty: 1 },
  { category: "LCD", model: "X6525/BG6", qty: 1 }, { category: "LCD", model: "X6511/BD4", qty: 1 },
  { category: "LCD", model: "KF7/X689", qty: 2 }, { category: "LCD", model: "CD8/X660", qty: 1 },
  { category: "LCD", model: "X653/BB4", qty: 2 }, { category: "LCD", model: "X624/KB7", qty: 3 },
  { category: "LCD", model: "CC9/LB8", qty: 2 }, { category: "LCD", model: "X688/LE6", qty: 2 },
  { category: "LCD", model: "CH7/CH6", qty: 1 }, { category: "LCD", model: "Ci7/CI6", qty: 2 },
  { category: "LCD", model: "CG6/KF8", qty: 1 }, { category: "LCD", model: "CA6", qty: 1 },
  { category: "LCD", model: "CA7", qty: 1 }, { category: "LCD", model: "BA2", qty: 1 },
  { category: "LCD", model: "BB2", qty: 1 }, { category: "LCD", model: "BC2", qty: 2 },
  { category: "LCD", model: "BC3", qty: 1 }, { category: "LCD", model: "BD2", qty: 1 },
  { category: "LCD", model: "A56", qty: 1 }, { category: "LCD", model: "A58, S 17", qty: 1 },
  { category: "LCD", model: "X559", qty: 1 }, { category: "LCD", model: "X612", qty: 1 },
  { category: "LCD", model: "X626", qty: 1 }, { category: "LCD", model: "X606", qty: 1 },
  { category: "LCD", model: "X5515", qty: 1 }, { category: "LCD", model: "X5516", qty: 1 },
  { category: "LCD", model: "X680", qty: 2 }, { category: "LCD", model: "KA7", qty: 5 },
  { category: "LCD", model: "LA7", qty: 1 }, { category: "LCD", model: "LC6", qty: 1 },
  { category: "LCD", model: "LB6", qty: 1 }, { category: "LCD", model: "3A ORG", qty: 2 },
  { category: "LCD", model: "3A COPY", qty: 2 }, { category: "TC", model: "BD2", qty: 2 },
  { category: "TC", model: "BA2", qty: 5 }, { category: "TC", model: "LA7", qty: 3 },
  { category: "TC", model: "BD3", qty: 5 }, { category: "TC", model: "X680", qty: 5 },
  { category: "TC", model: "KD6", qty: 2 }, { category: "TC", model: "KC8", qty: 10 },
  { category: "TC", model: "W5", qty: 2 }, { category: "TC", model: "KB7", qty: 2 },
  { category: "TC", model: "KD7", qty: 5 }, { category: "TC", model: "LC6", qty: 10 },
  { category: "TC", model: "G532", qty: 2 }, { category: "TC", model: "KC6", qty: 5 },
  { category: "TC", model: "KA7", qty: 5 }, { category: "TC", model: "B1F", qty: 10 },
  { category: "TC", model: "BC1", qty: 3 }, { category: "TC", model: "F1", qty: 10 },
  { category: "TC", model: "BE6", qty: 5 }, { category: "TC", model: "BC3", qty: 2 },
  { category: "TC", model: "B1P", qty: 5 }, { category: "TC", model: "B1G", qty: 5 },
  { category: "TC", model: "A33+", qty: 3 }, { category: "TC", model: "A33", qty: 2 },
  { category: "TC", model: "Y2", qty: 10 }, { category: "TC", model: "WX3P", qty: 5 },
  { category: "TC", model: "W2", qty: 2 }, { category: "TC", model: "F3", qty: 3 },
  { category: "TC", model: "BB2", qty: 5 }, { category: "TC", model: "RIO MBCL", qty: 4 },
  { category: "TC", model: "BD1", qty: 2 }, { category: "TC", model: "A56", qty: 5 },
  { category: "TC", model: "BC2", qty: 5 }, { category: "TC", model: "X653", qty: 5 },
  { category: "LCD", model: "A16/A33", qty: 2 }, { category: "LCD", model: "24s", qty: 5 },
  { category: "LCD", model: "17BIG", qty: 10 }, { category: "LCD", model: "37S", qty: 10 },
  { category: "LCD", model: "16s", qty: 10 }, { category: "LCD", model: "11s", qty: 5 },
  { category: "LCD", model: "24BIG", qty: 5 }, { category: "LCD", model: "37BIG", qty: 5 },
  { category: "LCD", model: "B1F", qty: 2 }, { category: "LCD", model: "20 PIN", qty: 5 },
  { category: "FLEX", model: "A20", qty: 2 }, { category: "FLEX", model: "A20s", qty: 2 },
  { category: "FLEX", model: "A50", qty: 2 }, { category: "FLEX", model: "A31", qty: 2 },
  { category: "FLEX", model: "B1F", qty: 5 }, { category: "FLEX", model: "BF7", qty: 3 },
  { category: "FLEX", model: "B1P", qty: 5 }, { category: "FLEX", model: "LC6", qty: 5 },
  { category: "FLEX", model: "X657", qty: 10 }, { category: "FLEX", model: "KD7", qty: 5 },
  { category: "FLEX", model: "KA7", qty: 5 }, { category: "FLEX", model: "KF6", qty: 5 },
  { category: "FLEX", model: "X653", qty: 5 }, { category: "FLEX", model: "CF7", qty: 5 },
  { category: "ON/OFF", model: "KB8", qty: 5 }, { category: "ON/OFF", model: "KC8", qty: 10 },
  { category: "ON/OFF", model: "KA7", qty: 5 }, { category: "ON/OFF", model: "X657", qty: 10 },
  { category: "CAM", model: "KC8", qty: 10 }, { category: "CAM", model: "KD6", qty: 3 },
  { category: "CAM", model: "KG5", qty: 3 }, { category: "CAM", model: "KC6", qty: 3 },
  { category: "CAM", model: "KB7", qty: 2 }, { category: "CAM", model: "KD7", qty: 5 },
  { category: "CAM", model: "X657", qty: 10 }, { category: "CAM", model: "POP 4", qty: 2 },
  { category: "CAM", model: "X680", qty: 2 }, { category: "CAM", model: "CF7", qty: 3 },
  { category: "DOOR", model: "A750", qty: 2 }, { category: "DOOR", model: "A520", qty: 2 },
  { category: "DOOR", model: "A710", qty: 1 }, { category: "DOOR", model: "A510", qty: 1 },
  { category: "DOOR", model: "A310", qty: 1 }, { category: "DOOR", model: "A710 (Alt)", qty: 1 },
  { category: "DOOR", model: "A530", qty: 1 }, { category: "DOOR", model: "A30", qty: 1 },
  { category: "DOOR", model: "S8+", qty: 1 }, { category: "DOOR", model: "S9+", qty: 1 },
  { category: "DOOR", model: "S9", qty: 1 }, { category: "DOOR", model: "S6", qty: 1 },
  { category: "DOOR", model: "S7 E", qty: 2 }, { category: "DOOR", model: "S6 E", qty: 1 },
  { category: "DOOR", model: "S6E+", qty: 1 }, { category: "DOOR", model: "NOTE 8", qty: 1 },
  { category: "DOOR", model: "NOTE 9", qty: 1 }, { category: "FLEX", model: "A03 CORE", qty: 1 },
  { category: "ON/OFF", model: "KD7", qty: 5 }
];

async function seedFinal214() {
  console.log(`🚀 Starting Seed for Branch: ${BRANCH_ID} (${rawProducts.length} items)`);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const CHUNK_SIZE = 400;

  for (let i = 0; i < rawProducts.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = rawProducts.slice(i, i + CHUNK_SIZE);
    const productsRef = collection(db, 'products');

    chunk.forEach((item) => {
      const newRef = doc(productsRef);
      const productData = {
        id: newRef.id,
        productName: item.model.trim(),
        productNameLower: item.model.trim().toLowerCase(),
        category: item.category.trim(),
        categoryLower: item.category.trim().toLowerCase(),
        model: item.model.trim(),
        modelLower: item.model.trim().toLowerCase(),
        costPrice: 0,
        sellingPrice: null,
        quantity: item.qty,
        branch: BRANCH_ID,
        businessId: BUSINESS_ID,
        confirm: true,
        status: 'store',
        addedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(newRef, productData);
    });

    try {
      console.log(`📦 Committing batch ${Math.floor(i/CHUNK_SIZE) + 1}...`);
      await batch.commit();
    } catch (e) {
      console.error("❌ Batch Error:", e.message);
      process.exit(1);
    }
  }

  console.log("\n✨ SUCCESS: 214 products uploaded with updated stock.");
  process.exit(0);
}

seedFinal214();