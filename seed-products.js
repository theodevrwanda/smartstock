import { initializeApp }from'firebase/app';
import { getFirestore, collection, doc, writeBatch }from'firebase/firestore';

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
};

// Fixed IDs (Verified)
const BUSINESS_ID = 'ytrEr0KWRkhIL0285YY0';
const BRANCH_ID = '6yBRjAKZua16KolwrnMV';

// ==================== PRODUCT DATA (161 ITEMS) ====================
const rawProducts = [
  { category: "lcd", model: "X657", qty: 10 }, { category: "lcd", model: "KC8", qty: 9 },
  { category: "lcd", model: "KA7", qty: 4 }, { category: "lcd", model: "KB7", qty: 3 },
  { category: "lcd", model: "KB8", qty: 3 }, { category: "lcd", model: "X688", qty: 4 },
  { category: "lcd", model: "X680", qty: 2 }, { category: "lcd", model: "X682", qty: 2 },
  { category: "lcd", model: "CF7", qty: 2 }, { category: "lcd", model: "A60/ki5/BF7", qty: 5 },
  { category: "lcd", model: "X6516", qty: 0 }, { category: "lcd", model: "X6517", qty: 0 },
  { category: "lcd", model: "BF6", qty: 0 }, { category: "lcd", model: "X653", qty: 2 },
  { category: "lcd", model: "KD7", qty: 4 }, { category: "lcd", model: "LA7", qty: 1 },
  { category: "lcd", model: "LB6", qty: 1 }, { category: "lcd", model: "LC6", qty: 1 },
  { category: "lcd", model: "BA2", qty: 1 }, { category: "lcd", model: "B1G", qty: 1 },
  { category: "lcd", model: "X689/KF7", qty: 2 }, { category: "lcd", model: "BD3/KF6/X658/KG6", qty: 5 },
  { category: "lcd", model: "KG5", qty: 5 }, { category: "lcd", model: "KG6", qty: 0 },
  { category: "lcd", model: "KG7", qty: 1 }, { category: "lcd", model: "CG6", qty: 1 },
  { category: "lcd", model: "LB7", qty: 1 }, { category: "lcd", model: "A56", qty: 1 },
  { category: "lcd", model: "BC2", qty: 2 }, { category: "lcd", model: "BC1", qty: 1 },
  { category: "lcd", model: "BC3", qty: 1 }, { category: "lcd", model: "BD2", qty: 2 },
  { category: "lcd", model: "BD1", qty: 1 }, { category: "lcd", model: "BD4", qty: 1 },
  { category: "lcd", model: "CA6", qty: 1 }, { category: "lcd", model: "KD6", qty: 2 },
  { category: "lcd", model: "BB2", qty: 1 }, { category: "lcd", model: "X5516", qty: 1 },
  { category: "lcd", model: "X5515", qty: 1 }, { category: "lcd", model: "X612", qty: 1 },
  { category: "lcd", model: "K7/W5", qty: 2 }, { category: "lcd", model: "CA8", qty: 1 },
  { category: "lcd", model: "X559", qty: 1 }, { category: "lcd", model: "CH6", qty: 1 },
  { category: "lcd", model: "KC6", qty: 1 }, { category: "lcd", model: "CC9 copy", qty: 1 },
  { category: "lcd", model: "CD8", qty: 1 }, { category: "lcd", model: "C8", qty: 0 },
  { category: "lcd", model: "C9", qty: 1 }, { category: "lcd", model: "S17", qty: 1 },
  { category: "lcd", model: "J1 copy", qty: 2 }, { category: "lcd", model: "J2 copy", qty: 2 },
  { category: "lcd", model: "J3/5 copy", qty: 2 }, { category: "lcd", model: "J4 copy", qty: 1 },
  { category: "lcd", model: "J6 copy", qty: 1 }, { category: "lcd", model: "J7 copy", qty: 1 },
  { category: "lcd", model: "J730 copy", qty: 1 }, { category: "lcd", model: "J250 copy", qty: 1 },
  { category: "lcd", model: "A530 copy", qty: 1 }, { category: "lcd", model: "A20 copy", qty: 1 },
  { category: "lcd", model: "A30 copy", qty: 1 }, { category: "lcd", model: "A10s org", qty: 1 },
  { category: "lcd", model: "A20 org", qty: 1 }, { category: "lcd", model: "A30 org", qty: 1 },
  { category: "lcd", model: "A21 org", qty: 1 }, { category: "lcd", model: "A12/A02 org", qty: 2 },
  { category: "lcd", model: "A03/A02s/A03s", qty: 2 }, { category: "lcd", model: "J260", qty: 1 },
  { category: "lcd", model: "A260", qty: 1 }, { category: "lcd", model: "A520 org", qty: 1 },
  { category: "lcd", model: "J730 org", qty: 1 }, { category: "lcd", model: "J530 org", qty: 1 },
  { category: "lcd", model: "A750 org", qty: 1 }, { category: "lcd", model: "A03 core", qty: 1 },
  { category: "lcd", model: "A01", qty: 1 }, { category: "lcd", model: "A01 core", qty: 1 },
  { category: "lcd", model: "A04s", qty: 1 }, { category: "lcd", model: "A51 org", qty: 1 },
  { category: "lcd", model: "A31 org", qty: 1 }, { category: "lcd", model: "G610 copy", qty: 1 },
  { category: "lcd", model: "J610 org", qty: 1 }, { category: "lcd", model: "A20E", qty: 1 },
  { category: "lcd", model: "A11", qty: 1 }, { category: "lcd", model: "J330", qty: 1 },
  { category: "lcd", model: "A13", qty: 1 }, { category: "lcd", model: "G570", qty: 1 },
  { category: "lcd", model: "A6+ copy", qty: 1 }, { category: "lcd", model: "J810 copy", qty: 1 },
  { category: "lcd", model: "iPhone 6", qty: 2 }, { category: "lcd", model: "iPhone 6s", qty: 2 },
  { category: "lcd", model: "iPhone 7", qty: 1 }, { category: "lcd", model: "iPhone 7+", qty: 2 },
  { category: "lcd", model: "iPhone 8+", qty: 2 }, { category: "lcd", model: "iPhone 6+", qty: 2 },
  { category: "lcd", model: "iPhone 6s+", qty: 2 }, { category: "lcd", model: "iPhone 5", qty: 0 },
  { category: "lcd", model: "iPhone 8", qty: 1 }, { category: "lcd", model: "iPhone X", qty: 1 },
  { category: "Switch", model: "Switch KC8", qty: 0 }, { category: "Switch", model: "Switch KA7", qty: 0 },
  { category: "Switch", model: "Switch X657", qty: 0 }, { category: "Switch", model: "Switch KB7", qty: 0 },
  { category: "Switch", model: "Switch KB8", qty: 0 }, { category: "Switch", model: "Switch CF7", qty: 0 },
  { category: "Switch", model: "Switch B1", qty: 0 }, { category: "Touch", model: "Touch B1F", qty: 10 },
  { category: "Touch", model: "Touch B1p", qty: 5 }, { category: "Touch", model: "Touch B1G", qty: 5 },
  { category: "Touch", model: "Touch F1", qty: 7 }, { category: "Touch", model: "Touch WX3P", qty: 0 },
  { category: "Touch", model: "Touch WX3", qty: 0 }, { category: "Touch", model: "Touch K7/W5", qty: 2 },
  { category: "Touch", model: "Touch mobicel", qty: 6 }, { category: "Touch", model: "Touch Y2", qty: 6 },
  { category: "Touch", model: "Touch A56", qty: 2 }, { category: "Touch", model: "Touch BC2", qty: 4 },
  { category: "Touch", model: "Touch BA2", qty: 5 }, { category: "Touch", model: "Touch LC6", qty: 5 },
  { category: "Touch", model: "Touch KC6", qty: 2 }, { category: "Touch", model: "Touch KA7", qty: 2 },
  { category: "Touch", model: "Touch KC8", qty: 3 }, { category: "Touch", model: "Touch BD3/KG5/X658/K15/A60/BF7/smart 7", qty: 3 },
  { category: "Touch", model: "Touch A33", qty: 2 }, { category: "Touch", model: "Touch W2", qty: 2 },
  { category: "Touch", model: "Touch A14", qty: 2 }, { category: "Touch", model: "Touch G532", qty: 2 },
  { category: "Touch", model: "Touch KD7/CD6/CD7/CC6/X655", qty: 5 }, { category: "Touch", model: "Touch KB7/624", qty: 2 },
  { category: "Touch", model: "Touch CF7", qty: 2 }, { category: "Flex", model: "Flex KC8/KD7/X650/KC2", qty: 0 },
  { category: "Flex", model: "Flex X657", qty: 0 }, { category: "Flex", model: "Flex KB7", qty: 0 },
  { category: "Flex", model: "Flex CF7", qty: 0 }, { category: "Flex", model: "Flex KG5", qty: 0 },
  { category: "Flex", model: "Flex KA7", qty: 0 }, { category: "Flex", model: "Flex X688/X680", qty: 0 },
  { category: "Flex", model: "Flex KF6", qty: 0 }, { category: "Flex", model: "Flex BC2", qty: 0 },
  { category: "Flex", model: "Flex BF6", qty: 0 }, { category: "Flex", model: "Flex BF7", qty: 0 },
  { category: "Flex", model: "Flex KB8", qty: 0 }, { category: "Flex", model: "Flex W5", qty: 0 },
  { category: "Flex", model: "Flex BIF", qty: 0 }, { category: "Flex", model: "Flex BIP", qty: 0 },
  { category: "Flex", model: "Flex K7", qty: 0 }, { category: "Flex", model: "Flex BIG", qty: 0 },
  { category: "Touch", model: "Touch KB8", qty: 0 }, { category: "Touch", model: "Touch A35", qty: 2 },
  { category: "Touch", model: "Touch A33+", qty: 0 }, { category: "Touch", model: "Touch S15", qty: 1 },
  { category: "Touch", model: "Touch BD2", qty: 1 }, { category: "Touch", model: "Touch 508", qty: 0 },
  { category: "Touch", model: "Touch 680/688/LC6/KF7/X689", qty: 2 }, { category: "Touch", model: "Touch mobicel big", qty: 2 },
  { category: "Touch", model: "Touch A16", qty: 2 }, { category: "Touch", model: "Touch Y6", qty: 2 },
  { category: "Touch", model: "Touch Y3", qty: 0 }, { category: "Touch", model: "Touch S1", qty: 2 },
  { category: "Touch", model: "Touch V12", qty: 2 }, { category: "Touch", model: "Touch V18", qty: 1 },
  { category: "Touch", model: "Touch V11", qty: 2 }
];

async function seedFinalData() {
  console.log(`🚀 Starting Re-Upload of ${rawProducts.length} items...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const CHUNK_SIZE = 450; 

  for (let i = 0; i < rawProducts.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = rawProducts.slice(i, i + CHUNK_SIZE);
    const productsRef = collection(db, 'products');

    chunk.forEach((item) => {
      const newRef = doc(productsRef);
      const categoryName = (item.category || "General").trim();
      
      const productData = {
        id: newRef.id,
        productName: item.model.trim(),
        productNameLower: item.model.trim().toLowerCase(),
        category: categoryName,
        categoryLower: categoryName.toLowerCase(),
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
      await batch.commit();
      console.log(`✅ Batch ${Math.floor(i/CHUNK_SIZE) + 1} uploaded.`);
    } catch (e) {
      console.error("❌ Error uploading batch:", e.message);
    }
  }
  console.log("\n✨ ALL PRODUCTS REPLACED SUCCESSFULLY.");
  process.exit(0);
}

seedFinalData();