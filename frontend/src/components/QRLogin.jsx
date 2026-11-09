export default function QRLogin({ qr }) {
  return (
    <div className="qr-screen">
      <h1>WA Automation</h1>
      <p>Scan the QR code with your WhatsApp mobile app</p>
      {qr ? (
        <img src={qr} alt="WhatsApp QR Code" className="qr-image" />
      ) : (
        <div className="spinner" />
      )}
    </div>
  );
}
