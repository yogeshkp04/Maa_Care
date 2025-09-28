"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import productRaw from "../../indian_file_json_updated.json";

type Product = {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  additives_tags?: string[] | string;
  alert: string;
  recommended?: string;
  nutriscore_grade?: string;
  nova_group?: string;
};

const notSafeList = [
  "ibuprofen", "isotretinoin", "combiflam", "isotroin", "aspirin",
  "naproxen", "warfarin", "misoprostol", "methotrexate",
  "tetracycline", "doxycycline", "ciprofloxacin",
  "alcohol", "msg", "monosodium glutamate", "e621",
  "e627", "e631", "e110", "e102", "e133", 
];

const cautionList = [
  "caffeine", "aspartame", "sodium benzoate", "citric acid", "e330", "331",
  "high fructose corn syrup", "palm oil", "sorbitol", "xylitol",
  "trans fat", "hydrogenated oil", "partially hydrogenated oil",
  "stabilizer 440", "artificial flavouring", "rose flavour",
  "active culture", "acidity regulators","e211"
];

const normalize = (text: string) => text.toLowerCase().replace(/[\s\-_.]/g, "");

const products: Product[] = productRaw as Product[];

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [safetyStatus, setSafetyStatus] = useState<{
    status: string;
    statusType: 'safe' | 'caution' | 'unsafe';
    foundNotSafe: string[];
    foundCaution: string[];
  } | null>(null);

  const handleScan = (data: string) => {
    const scannedCode = data.toString().trim();
    
    let product = products.find((p) => p.code === scannedCode);
    
    if (!product) {
      const normalizedScannedCode = scannedCode.replace(/^0+/, '');
      product = products.find(p => p.code === normalizedScannedCode);
    }
    
    if (!product && scannedCode.length > 3) {
      product = products.find((p) => {
        const shortCode = p.code.trim();
        return scannedCode.endsWith(shortCode) && shortCode.length >= 3;
      });
    }
    
    if (!product && scannedCode.length > 6) {
      product = products.find((p) => {
        const shortCode = p.code.trim();
        return scannedCode.includes(shortCode) && shortCode.length >= 3;
      });
    }

    setScanResult(scannedCode);
    setFoundProduct(product || null);

    if (product) {
      const ingredients = normalize(product.ingredients_text || "");

      const additivesNormalized =
        Array.isArray(product.additives_tags)
          ? product.additives_tags.map(normalize).join(" ")
          : typeof product.additives_tags === "string"
            ? normalize(product.additives_tags)
            : "";

      const allText = ingredients + " " + additivesNormalized;

      const foundNotSafe = notSafeList.filter((term) => allText.includes(normalize(term)));
      const foundCaution = cautionList.filter((term) => allText.includes(normalize(term)));

      let status = "✅ Safe during pregnancy";
      let statusType: 'safe' | 'caution' | 'unsafe' = 'safe';
      
      if (foundNotSafe.length > 0) {
        status = `❌ Not safe during pregnancy!`;
        statusType = 'unsafe';
      } else if (foundCaution.length > 0) {
        status = `⚠️ Consume with caution during pregnancy`;
        statusType = 'caution';
      }

      setSafetyStatus({
        status,
        statusType,
        foundNotSafe,
        foundCaution
      });
    } else {
      setSafetyStatus(null);
    }
  };

  return (
    <div className="flex w-full h-full bg-gray-50">
      <div className="h-60 w-80 rounded-lg overflow-hidden ml-5 self-center flex items-center justify-center relative">
        <div className="h-24 w-80 absolute z-10" />
        <div className="bg-black/50 h-18 w-80 absolute z-10 top-0" />
        <div className="bg-black/50 h-18 w-80 absolute z-10 bottom-0" />
        
        <Scanner
          formats={[
            "codabar",
            "code_39", 
            "code_93",
            "code_128",
            "ean_8",
            "ean_13",
            "itf",
            "linear_codes",
            "upc_a",
            "upc_e",
          ]}
          onScan={(detectedCodes) => {
            if (detectedCodes.length > 0) {
              handleScan(detectedCodes[0].rawValue);
            }
          }}
          onError={(error) => {
            console.error(`Scanner error: ${error}`);
          }}
          allowMultiple={false}
          scanDelay={500}
          components={{
            finder: false,
          }}
        />
      </div>

      <div className="flex-1 p-10 ml-5">
        <div className="bg-white h-full w-full rounded-2xl border border-dashed shadow-lg overflow-y-auto">
          {scanResult ? (
            <div className="p-6 space-y-4">
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Scan Result</h2>
                <p className="text-sm text-gray-600">
                  Scanned Code: <span className="font-mono font-bold text-blue-600">{scanResult}</span>
                </p>
              </div>

              {foundProduct ? (
                <div className="space-y-6">
                  {safetyStatus && (
                    <div className={`p-4 rounded-lg border-2 ${
                      safetyStatus.statusType === 'unsafe' 
                        ? 'bg-red-50 border-red-300 text-red-800' 
                        : safetyStatus.statusType === 'caution'
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                        : 'bg-green-50 border-green-300 text-green-800'
                    }`}>
                      <h3 className="font-bold text-lg mb-2">{safetyStatus.status}</h3>
                      
                      {safetyStatus.foundNotSafe.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-red-700">⚠️ Contains unsafe ingredients:</p>
                          <ul className="list-disc list-inside mt-1 text-sm">
                            {safetyStatus.foundNotSafe.map((item, index) => (
                              <li key={index} className="text-red-600">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {safetyStatus.foundCaution.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-yellow-700">⚠️ Contains ingredients to limit:</p>
                          <ul className="list-disc list-inside mt-1 text-sm">
                            {safetyStatus.foundCaution.map((item, index) => (
                              <li key={index} className="text-yellow-600">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product Information */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Product Information</h3>
                    
                    <div>
                      <span className="font-semibold text-purple-700">Product Name:</span>
                      <span className="ml-2 text-gray-800">{foundProduct.product_name}</span>
                    </div>
                    
                    <div>
                      <span className="font-semibold text-purple-700">Brand:</span>
                      <span className="ml-2 text-gray-800">{foundProduct.brands}</span>
                    </div>
                    
                    <div>
                      <span className="font-semibold text-purple-700">Product Code:</span>
                      <span className="ml-2 text-gray-800">{foundProduct.code}</span>
                    </div>

                    {foundProduct.ingredients_text && (
                      <div>
                        <span className="font-semibold text-purple-700">Ingredients:</span>
                        <p className="mt-1 text-sm text-gray-700 bg-white p-2 rounded border">
                          {foundProduct.ingredients_text}
                        </p>
                      </div>
                    )}

                    {foundProduct.additives_tags && (
                      <div>
                        <span className="font-semibold text-purple-700">Additives:</span>
                        <p className="mt-1 text-sm text-gray-700">
                          {Array.isArray(foundProduct.additives_tags) 
                            ? foundProduct.additives_tags.join(", ") 
                            : foundProduct.additives_tags || "N/A"}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="font-semibold text-purple-700">NutriScore:</span>
                        <span className="ml-2 text-gray-800 uppercase">{foundProduct.nutriscore_grade || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-purple-700">NOVA Group:</span>
                        <span className="ml-2 text-gray-800">{foundProduct.nova_group || "N/A"}</span>
                      </div>
                    </div>

                    {foundProduct.recommended && (
                      <div>
                        <span className="font-semibold text-purple-700">Recommendation:</span>
                        <span className="ml-2 text-gray-800">{foundProduct.recommended}</span>
                      </div>
                    )}

                    {foundProduct.alert && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <span className="font-semibold text-blue-700">Alert:</span>
                        <span className="ml-2 text-blue-800">{foundProduct.alert}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Product Not Found</h3>
                  <p className="text-gray-600 mb-4">
                    The scanned product is not in our pregnancy safety database.
                  </p>
                  <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
                    <p><strong>Scanned:</strong> {scanResult}</p>
                    <p className="mt-1">Try scanning a different product or check if the barcode is clear.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Scan</h3>
              <p className="text-gray-500">Point your camera at a product barcode</p>
              <div className="mt-4 text-xs text-gray-400">
                <p>🤰 Pregnancy Safety Scanner</p>
                <p>Checking for unsafe ingredients and additives</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}