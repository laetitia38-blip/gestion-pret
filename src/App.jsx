import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { createClient } from "@supabase/supabase-js";

// ✅ Import logos (OPTIONNEL : mets tes fichiers dans /src/assets/)
import logo1 from "./assets/logo1.png";
import logo2 from "./assets/logo2.png";

// ✅ connexion Supabase
const supabase = createClient(
  "https://drgejcbhcrhmixycuehf.supabase.co",
  "sb_publishable_wmLuIFS4tM-cQzCYxBsh8A_zh8WXjvf"
);

export default function App() {

  const sigRef = useRef(null);
  const sigReturnRefs = useRef({});

  const [form, setForm] = useState({
    name: "",
    type: "",
    code: "",
    startDate: "",
    expectedReturnDate: "",
  });

  const [loans, setLoans] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [newBlacklistName, setNewBlacklistName] = useState("");

  useEffect(() => {
    fetchLoans();
    fetchBlacklist();
  }, []);

  const fetchLoans = async () => {
    const { data } = await supabase.from("loans").select("*");
    setLoans(data || []);
  };

  const fetchBlacklist = async () => {
    const { data } = await supabase.from("blacklist").select("*");
    setBlacklist((data || []).map((b) => b.name));
  };

  // ✅ AJOUT PRET
  const handleAdd = async () => {

    let signature = null;

    if (sigRef.current && !sigRef.current.isEmpty()) {
      signature = sigRef.current.toDataURL("image/png", 0.5);
    }

    await supabase.from("loans").insert([
      { ...form, signature, returned: false }
    ]);

    setForm({
      name: "",
      type: "",
      code: "",
      startDate: "",
      expectedReturnDate: "",
    });

    sigRef.current?.clear();

    fetchLoans();
  };

  // ✅ RETOUR
  const handleReturn = async (id) => {
    const sigPad = sigReturnRefs.current[id];

    let signature = null;

    if (sigPad && !sigPad.isEmpty()) {
      signature = sigPad.toDataURL("image/png", 0.5);
    }

    await supabase
      .from("loans")
      .update({
        returned: true,
        realReturnDate: new Date().toISOString().split("T")[0],
        returnSignature: signature,
      })
      .eq("id", id);

    fetchLoans();
  };

  // ✅ BLACKLIST
  const handleAddBlacklist = async () => {
    if (!newBlacklistName) return;

    await supabase.from("blacklist").insert([{ name: newBlacklistName }]);
    setNewBlacklistName("");
    fetchBlacklist();
  };

  const handleRemoveBlacklist = async (name) => {
    await supabase.from("blacklist").delete().eq("name", name);
    fetchBlacklist();
  };

  // ✅ PDF
  const generatePDF = (loan) => {
    const doc = new jsPDF();

    try {
      doc.addImage(logo1, "PNG", 10, 10, 60, 20);
    } catch (e) {} // ✅ évite crash si logo absent

    doc.setFontSize(18);
    doc.text("Contrat de prêt", 105, 40, { align: "center" });

    doc.line(10, 45, 200, 45);

    doc.setFontSize(12);
    doc.text(`Nom : ${loan.name}`, 20, 60);
    doc.text(`Matériel : ${loan.type}`, 20, 70);
    doc.text(`Date emprunt : ${loan.startDate}`, 20, 80);
    doc.text(`Retour prévu : ${loan.expectedReturnDate}`, 20, 90);

    if (loan.realReturnDate) {
      doc.text(`Retour : ${loan.realReturnDate}`, 20, 100);
    }

    if (loan.signature) {
      doc.text("Signature emprunt", 105, 120, { align: "center" });
      doc.addImage(loan.signature, "PNG", 75, 130, 60, 30);
    }

    if (loan.returnSignature) {
      doc.text("Signature retour", 105, 170, { align: "center" });
      doc.addImage(loan.returnSignature, "PNG", 75, 180, 60, 30);
    }

    try {
      doc.addImage(logo2, "PNG", 140, 260, 60, 20);
    } catch (e) {}

    doc.save(`pret-${loan.name}.pdf`);
  };

  return (
    <div style={{ padding: 30, background: "#f5f6fa", fontFamily: "Arial" }}>

      {/* BLACKLIST */}
      <div style={boxStyle}>
        <h2>🚫 Blacklist</h2>

        <input
          value={newBlacklistName}
          onChange={(e) => setNewBlacklistName(e.target.value)}
          style={inputStyle}
        />

        <button onClick={handleAddBlacklist} style={btnStyle}>Ajouter</button>
      </div>

      {/* FORMULAIRE CENTRÉ */}
      <div style={{ ...boxStyle, alignItems: "center" }}>
        <h2>📦 Nouveau prêt</h2>

        <input placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
        />

        {/* ✅ MENU DEROUlant */}
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={inputStyle}
        >
          <option value="">-- Choisir matériel --</option>
          <option value="PC">PC</option>
          <option value="Câbles">Câbles</option>
          <option value="Adaptateur">Adaptateur</option>
        </select>

        <input placeholder="Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          style={inputStyle}
        />

        <input type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          style={inputStyle}
        />

        <input type="date"
          value={form.expectedReturnDate}
          onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
          style={inputStyle}
        />

        <p>Signature</p>

        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width: 300,
            height: 100,
            style: {
              border: "1px solid #ccc",
              display: "block",
              margin: "auto"
            }
          }}
        />

        <button onClick={() => sigRef.current.clear()} style={secondaryBtn}>Effacer</button>

        <button onClick={handleAdd} style={btnStyle}>Ajouter prêt</button>
      </div>

      {/* LISTE */}
      <div style={boxStyle}>
        <h2>📋 Liste des prêts</h2>

        {loans.map((loan) => (
          <div key={loan.id} style={cardStyle}>

            <h3>{loan.name}</h3>

            <p>{loan.type}</p>
            <p>{loan.startDate} → {loan.expectedReturnDate}</p>

            {loan.signature && (
              <img src={loan.signature} style={signatureStyle} />
            )}

            {!loan.returned ? (
              <>
                <SignatureCanvas
                  ref={(ref) => (sigReturnRefs.current[loan.id] = ref)}
                  canvasProps={{ width: 300, height: 100, style: { border: "1px solid #ccc" } }}
                />

                <button onClick={() => handleReturn(loan.id)} style={btnStyle}>
                  Valider retour
                </button>
              </>
            ) : (
              <>
                <p>✅ Rendu {loan.realReturnDate}</p>

                {loan.returnSignature && (
                  <img src={loan.returnSignature} style={signatureStyle} />
                )}
              </>
            )}

            <button onClick={() => generatePDF(loan)} style={secondaryBtn}>
              📄 PDF
            </button>

          </div>
        ))}
      </div>

    </div>
  );
}

// ✅ STYLES
const boxStyle = {
  background: "white",
  padding: 20,
  borderRadius: 10,
  marginBottom: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const btnStyle = {
  background: "#3498db",
  color: "white",
  padding: 10,
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  marginTop: 10
};

const secondaryBtn = {
  background: "#95a5a6",
  color: "white",
  padding: 8,
  borderRadius: 5,
  border: "none",
  marginTop: 10
};

const inputStyle = {
  width: 300,
  padding: 10,
  marginBottom: 10,
  borderRadius: 5,
  border: "1px solid #ccc"
};

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 15,
  marginTop: 10,
  width: 300
};

const signatureStyle = {
  width: 200,
  marginTop: 10,
  border: "1px solid #ccc"
};
