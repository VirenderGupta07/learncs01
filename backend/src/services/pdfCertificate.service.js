const PDFDocument = require('pdfkit');

/**
 * Renders a landscape A4 certificate to an in-memory buffer. Runs inside the
 * BullMQ worker (jobs/certificate.worker.js), never on the request thread.
 */
function generateCertificatePDF({ studentName, courseTitle, score, issuedAt, certificateId, verificationCode }) {
  return new Promise((resolve, reject) => {
    try {
      // margin: 0 is deliberate - this is a full-bleed design (dark background +
      // hand-drawn border), and PDFKit's default page margin creates an
      // invisible "safe area" boundary that silently triggers an automatic
      // page break for any text placed close to the true page edge. With the
      // margin removed, all coordinates below are relative to the real page
      // bounds, which we control entirely ourselves via the border rect.
      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      doc.rect(0, 0, pageWidth, pageHeight).fill('#0b1320');
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(2).stroke('#d4af37');

      doc.fillColor('#d4af37').fontSize(14).font('Helvetica-Bold').text('LEARNCS01.COM', 0, 60, { align: 'center' });

      doc.fillColor('#ffffff').fontSize(34).font('Helvetica-Bold').text('Certificate of Completion', 0, 95, {
        align: 'center',
      });

      doc.fillColor('#cbd5e1').fontSize(14).font('Helvetica').text('This certifies that', 0, 160, { align: 'center' });

      // From here on, every block's height is measured (not guessed) before
      // drawing the next one. Student names and course titles are
      // user-authored and arbitrary-length in real usage - fixed y-offsets
      // between blocks silently collide as soon as either one wraps to a
      // second line (this previously shipped with exactly that bug for long
      // course titles). A running cursor avoids that regardless of length.
      const contentWidth = pageWidth - 160;
      const contentX = 80;
      let cursorY = 190;

      doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold');
      doc.text(studentName, contentX, cursorY, { align: 'center', width: contentWidth });
      cursorY += doc.heightOfString(studentName, { width: contentWidth }) + 16;

      doc.fillColor('#cbd5e1').fontSize(14).font('Helvetica');
      const completedLine = 'has successfully completed the course';
      doc.text(completedLine, contentX, cursorY, { align: 'center', width: contentWidth });
      cursorY += doc.heightOfString(completedLine, { width: contentWidth }) + 10;

      doc.fillColor('#d4af37').fontSize(22).font('Helvetica-Bold');
      doc.text(courseTitle, contentX, cursorY, { align: 'center', width: contentWidth });
      cursorY += doc.heightOfString(courseTitle, { width: contentWidth }) + 22;

      doc.fillColor('#cbd5e1').fontSize(12).font('Helvetica');
      const scoreLine = `with a final score of ${score}%`;
      doc.text(scoreLine, contentX, cursorY, { align: 'center', width: contentWidth });
      cursorY += doc.heightOfString(scoreLine, { width: contentWidth }) + 28;

      const formattedDate = new Date(issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc
        .fillColor('#94a3b8')
        .fontSize(10)
        .text(`Issued on ${formattedDate}`, contentX, cursorY, { align: 'center', width: contentWidth });

      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .text(`Certificate ID: ${certificateId}   ·   Verification Code: ${verificationCode}`, 60, pageHeight - 60, {
          width: pageWidth - 240,
          lineBreak: false,
        });
      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .text('Verify at learncs01.com/verify', pageWidth - 240, pageHeight - 60, {
          width: 180,
          align: 'right',
          lineBreak: false,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatePDF };
