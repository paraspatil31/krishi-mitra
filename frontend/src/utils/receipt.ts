import type { Order } from "@/types/order";
import type { PaymentRecord } from "@/types/payment";

export function generateReceiptHtml(order: Order, payment?: PaymentRecord | null): string {
  const orderId = (order.id || (order as any)._id || "KB-ORDER").toString();
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsRows = order.items
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 14px; color: #1f2937;">${idx + 1}. ${item.productName}</td>
        <td style="padding: 12px 8px; font-size: 14px; text-align: center; color: #4b5563;">${item.quantity} ${item.unit}</td>
        <td style="padding: 12px 8px; font-size: 14px; text-align: right; color: #4b5563;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 12px 8px; font-size: 14px; text-align: right; font-weight: 600; color: #111827;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>KrishiBazaar Receipt - #${orderId.slice(-8).toUpperCase()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      background-color: #f9fafb;
      color: #111827;
    }
    .receipt-container {
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      color: #064e3b;
      letter-spacing: -0.5px;
    }
    .logo span {
      color: #10b981;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .meta-card {
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 12px;
      padding: 14px;
    }
    .meta-title {
      font-weight: 700;
      color: #6b7280;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .meta-value {
      font-weight: 600;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f3f4f6;
      text-align: left;
      padding: 10px 8px;
      font-size: 12px;
      font-weight: 700;
      color: #4b5563;
      text-transform: uppercase;
    }
    .totals {
      border-top: 2px solid #e5e7eb;
      padding-top: 16px;
      margin-bottom: 24px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
      color: #4b5563;
    }
    .grand-total {
      font-size: 20px;
      font-weight: 900;
      color: #064e3b;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #d1d5db;
    }
    .escrow-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 14px;
      font-size: 12px;
      color: #166534;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      padding-top: 16px;
    }
    @media print {
      body {
        background: none;
        padding: 0;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div>
        <div class="logo">🌾 Krishi<span>Bazaar</span></div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Direct Farm-to-Table Marketplace</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">GSTIN: 27AABCK1234F1Z9 &bull; Support: support@krishibazaar.in</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">Official Receipt</span>
        <div style="font-size: 13px; font-weight: 700; color: #111827; margin-top: 8px;">Order #${orderId.slice(-8).toUpperCase()}</div>
        <div style="font-size: 11px; color: #6b7280;">${dateStr}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-title">Delivery Details</div>
        <div class="meta-value">${order.deliveryAddress || "Customer Home Address"}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Status: <strong style="text-transform: capitalize; color: #047857;">${order.status}</strong></div>
      </div>
      <div class="meta-card">
        <div class="meta-title">Farmer / Producer</div>
        <div class="meta-value">🧑‍🌾 ${order.farmerName || "Verified Agricultural Producer"}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Dispatch: Direct Farm Gate</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Produce Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Items Subtotal:</span>
        <span>₹${order.total.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Mandi Commission / Middlemen Fee:</span>
        <span style="color: #059669; font-weight: 600;">₹0.00 (Zero Commission)</span>
      </div>
      <div class="total-row">
        <span>Farm Quality Packaging:</span>
        <span style="color: #059669; font-weight: 600;">Free</span>
      </div>
      <div class="total-row grand-total">
        <span>Total Amount Paid:</span>
        <span>₹${order.total.toFixed(2)}</span>
      </div>
    </div>

    <div class="escrow-box">
      <strong>🔒 KrishiBazaar Escrow &amp; Blockchain Provenance Guarantee:</strong><br />
      Funds for this order are held in trust via Escrow. Payment is disbursed to the farmer only after the buyer confirms arrival and satisfaction.
      ${payment?.razorpayPaymentId ? `<br /><strong>Gateway Transaction ID:</strong> ${payment.razorpayPaymentId}` : ""}
    </div>

    <div class="footer">
      Thank you for empowering Indian farmers! &bull; Certified Fresh Harvest Guarantee &bull; Visit www.krishibazaar.in
    </div>
  </div>
</body>
</html>`;
}

export function downloadReceiptHtml(order: Order, payment?: PaymentRecord | null) {
  const htmlContent = generateReceiptHtml(order, payment);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const orderId = (order.id || (order as any)._id || "ORDER").slice(-8).toUpperCase();
  link.href = url;
  link.download = `KrishiBazaar_Receipt_${orderId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printReceipt(order: Order, payment?: PaymentRecord | null) {
  const htmlContent = generateReceiptHtml(order, payment);
  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    // Fallback if popup blocked: trigger direct download
    downloadReceiptHtml(order, payment);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
