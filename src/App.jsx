import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { createClient } from "@supabase/supabase-js";

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
      {
        ...form,
        signature,
        returned: false
      }
    ]);

    setForm({
      name: "",
      type: "",
      code: "",
      startDate: "",
      expectedReturnDate: "",
    });

    if (sigRef.current) sigRef.current.clear();

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

// ✅ PDF AVEC SIGNATURE
	const generatePDF = (loan) => {
  const doc = new jsPDF();

  // ✅ Logo haut
  doc.addImage(logo1, "PNG", 10, 10, 90, 20);

  // ✅ Titre plus bas
  doc.setFontSize(18);
  doc.text("Contrat de prêt", 105, 40, { align: "center" });

  // ✅ Ligne séparation
  doc.line(10, 45, 200, 45);

  // ✅ Infos
  doc.setFontSize(12);
  doc.text(`Nom : ${loan.name}`, 20, 60);
  doc.text(`Matériel : ${loan.type}`, 20, 70);
  doc.text(`Date emprunt : ${loan.startDate}`, 20, 80);
  doc.text(`Retour prévu : ${loan.expectedReturnDate}`, 20, 90);

  // ✅ Date de signature retour
  if (loan.realReturnDate) {
    doc.text(`Date de retour réel : ${loan.realReturnDate}`, 20, 100);
  }

  // ✅ Signature emprunt
  if (loan.signature) {
    doc.text("Signature emprunt :", 20, 110);
    doc.addImage(loan.signature, "PNG", 75, 120, 60, 30);
  }

  // ✅ Signature retour
  if (loan.returnSignature) {
    doc.text("Signature retour :", 20, 160);
    doc.addImage(loan.returnSignature, "PNG", 75, 170, 60, 30);
  }

  // ✅ Logo bas droite
  doc.addImage(logo2, "PNG", 140, 250, 65, 20);

  doc.save(`pret-${loan.name}.pdf`);
};

  return (
    <div style={{ padding: 30, backgroundColor: "#f5f6fa", fontFamily: "Arial" }}>

      {/* BLACKLIST */}
      <div style={{ background: "white", padding: 20, borderRadius: 10, marginBottom: 20 }}>
        <h2>🚫 Blacklist</h2>

        <input
          placeholder="Nom"
          value={newBlacklistName}
          onChange={(e) => setNewBlacklistName(e.target.value)}
          style={inputStyle}
        />

        <button onClick={handleAddBlacklist} style={btnStyle}>Ajouter</button>

        <ul>
          {blacklist.map((name, i) => (
            <li key={i}>
              {name}
              <button onClick={() => handleRemoveBlacklist(name)} style={dangerBtn}>❌</button>
            </li>
          ))}
        </ul>
      </div>

      {/* FORMULAIRE */}
      <div style={{ background: "white", padding: 20, borderRadius: 10, marginBottom: 20 }}>
        <h2>📦 Nouveau prêt</h2>

        <input placeholder="Nom" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
        />

        <input placeholder="Matériel" value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={inputStyle}
        />

        <input placeholder="Code" value={form.code}
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

        <p>Signature :</p>
        <SignatureCanvas ref={sigRef} canvasProps={{ width: 300, height: 100, style: { border: "1px solid #ccc" } }} />

        <button onClick={() => sigRef.current.clear()} style={secondaryBtn}>Effacer</button>

        <br /><br />

        <button onClick={handleAdd} style={btnStyle}>Ajouter prêt</button>
      </div>

      {/* LISTE */}
      <div style={{ background: "white", padding: 20, borderRadius: 10 }}>
        <h2>📋 Liste des prêts</h2>

        {loans.length === 0 && <p>Aucun prêt</p>}

        {loans.map((loan) => (
          <div key={loan.id} style={cardStyle}>

            <h3>{loan.name}</h3>

            <p>📦 {loan.type}</p>
            <p>Début : {loan.startDate}</p>
            <p>Retour : {loan.expectedReturnDate}</p>

            {loan.signature && (
              <img src={loan.signature} style={signatureStyle} />
            )}

            {!loan.returned ? (
              <>
                <p style={{ color: "orange" }}>En cours</p>

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
                <p style={{ color: "green" }}>✅ Rendu le {loan.realReturnDate}</p>

                {loan.returnSignature && (
                  <img src={loan.returnSignature} style={signatureStyle} />
                )}
              </>
            )}

            <button onClick={() => generatePDF(loan)} style={secondaryBtn}>PDF</button>

          </div>
        ))}
      </div>

    </div>
  );
}

// ✅ STYLES
const btnStyle = {
  background: "#3498db",
  color: "white",
  padding: "10px 15px",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  marginTop: 10
};

const secondaryBtn = {
  background: "#95a5a6",
  color: "white",
  padding: "8px 12px",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  marginTop: 10
};

const dangerBtn = {
  background: "#e74c3c",
  color: "white",
  marginLeft: 10,
  border: "none",
  borderRadius: 5,
  cursor: "pointer"
};

const inputStyle = {
  display: "block",
  marginBottom: 10,
  padding: 10,
  width: "100%",
  maxWidth: 300,
  borderRadius: 5,
  border: "1px solid #ccc"
};

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 15,
  marginTop: 10,
  background: "#fafafa"
};

const signatureStyle = {
  width: 200,
  marginTop: 10,
  border: "1px solid #ccc"
};
