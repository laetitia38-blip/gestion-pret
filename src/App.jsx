import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { createClient } from "@supabase/supabase-js";
import logo1 from "./assets/logo1.png";
import logo2 from "./assets/logo2.png";

// trigger deploy

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

  // ✅ charger prêts
  const fetchLoans = async () => {
    const { data } = await supabase.from("loans").select("*");
    setLoans(data || []);
  };

  // ✅ charger blacklist
  const fetchBlacklist = async () => {
    const { data } = await supabase.from("blacklist").select("*");
    setBlacklist((data || []).map((b) => b.name));
  };

  // ✅ AJOUT PRÊT (avec signature optimisée)
  const handleAdd = async () => {

    let signature = null;

    if (sigRef.current && !sigRef.current.isEmpty()) {
      // ✅ compression signature
      signature = sigRef.current.toDataURL("image/png", 0.5);
    }

    if (blacklist.includes(form.name)) {
      alert("⚠️ PERSONNE BLACKLISTÉE !");
    }

    const { error } = await supabase.from("loans").insert([
      {
        ...form,
        signature: signature,
        returned: false
      }
    ]);

    console.log("INSERT ERROR:", error);

    if (error) {
      alert("Erreur insertion !");
      return;
    }

    // reset
    setForm({
      name: "",
      type: "",
      code: "",
      startDate: "",
      expectedReturnDate: "",
    });

    if (sigRef.current) sigRef.current.clear();

    await fetchLoans();
  };

  // ✅ RETOUR MATÉRIEL
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
        returnSignature: signature
      })
      .eq("id", id);

    await fetchLoans();
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
``

  return (
    <div style={{ padding: 20 }}>

      {/* ✅ BLACKLIST */}
      <h2>Blacklist</h2>

      <input
        placeholder="Nom à blacklist"
        value={newBlacklistName}
        onChange={(e) => setNewBlacklistName(e.target.value)}
      />
      <button onClick={handleAddBlacklist}>Ajouter</button>

      <ul>
        {blacklist.map((name, i) => (
          <li key={i}>
            {name}
            <button onClick={() => handleRemoveBlacklist(name)}>❌</button>
          </li>
        ))}
      </ul>

      <hr />

      {/* ✅ FORMULAIRE */}
      <h2>Nouveau prêt</h2>

      <p>Nom :</p>
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <p>Matériel :</p>
      <input
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      />

      <p>Code :</p>
      <input
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
      />

      <p>Date de début :</p>
      <input
        type="date"
        value={form.startDate}
        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
      />

      <p>Date de retour théorique :</p>
      <input
        type="date"
        value={form.expectedReturnDate}
        onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
      />

      {/* ✅ SIGNATURE EMPRUNT */}
      <p>Signature emprunt :</p>
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{
          width: 300,
          height: 100,
          style: { border: "1px solid white" }
        }}
      />

      <button onClick={() => sigRef.current.clear()}>Effacer</button>

      <br /><br />
      <button onClick={handleAdd}>Ajouter prêt</button>

      <hr />

      {/* ✅ LISTE */}
      <h2>Liste des prêts</h2>

      {loans.length === 0 && <p>Aucun prêt</p>}

      {loans.map((loan) => (
        <div key={loan.id} style={{ border: "1px solid black", marginTop: 10, padding: 10 }}>

          <p><b>{loan.name}</b> - {loan.type}</p>
          <p>Retour prévu : {loan.expectedReturnDate}</p>

          {/* ✅ affichage signature */}
          {loan.signature && (
            <>
              <p>Signature :</p>
              <img
  src={loan.signature}
  alt="signature"
  
style={{
  width: 200,
  background: "white",
  padding: 5,
  borderRadius: 5
}}

/>

            </>
          )}

          {!loan.returned ? (
            <>
              <p style={{ color: "orange" }}>En cours</p>

              <SignatureCanvas
                ref={(ref) => (sigReturnRefs.current[loan.id] = ref)}
                canvasProps={{
                  width: 300,
                  height: 100,
                  style: { border: "1px solid black" }
                }}
              />

              <button onClick={() => handleReturn(loan.id)}>
                Valider retour
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "green" }}>
                ✅ Rendu le {loan.realReturnDate}
              </p>

              {loan.returnSignature && (
                <>
                  <p>Signature retour :</p>
                  <img
			src={loan.returnSignature}
			alt="signature retour"
  
			style={{
			width: 200,
			background: "white",
			padding: 5,
			borderRadius: 5
			}}

			/>

                </>
              )}
            </>
          )}

          <button onClick={() => generatePDF(loan)}>
            📄 Générer PDF
          </button>

        </div>
      ))}
    </div>
  );
}
