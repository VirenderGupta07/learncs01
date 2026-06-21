const test = require('node:test');
const assert = require('node:assert/strict');

process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret';
process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'learncs01-test-bucket';

const { generateCertificatePDF } = require('../src/services/pdfCertificate.service');
const { generatePresignedUploadUrl, generatePresignedViewUrl } = require('../src/services/s3Upload.service');

// PDFKit doesn't expose a page count on the buffer directly, but every page
// boundary writes a "/Type /Page" object - counting occurrences in the raw
// PDF bytes is a reliable, dependency-free way to assert "this rendered as
// exactly one page" without needing a PDF parser.
function countPages(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

test('generateCertificatePDF', async (t) => {
  await t.test('produces a valid single-page PDF for a normal-length name/title', async () => {
    const buf = await generateCertificatePDF({
      studentName: 'Ada Lovelace',
      courseTitle: 'Introduction to Algorithms',
      score: 94,
      issuedAt: new Date(),
      certificateId: 'cert-normal',
      verificationCode: 'CODE1234',
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500, 'expected a non-trivial PDF');
    assert.equal(buf.subarray(0, 4).toString(), '%PDF');
    assert.equal(countPages(buf), 1);
  });

  // Regression test: footer text positioned close to the page edge used to
  // silently overflow onto extra blank pages because of how PDFKit's
  // implicit document margin interacts with absolute y-coordinates near the
  // bottom of the page. Fixed by removing the margin and measuring real
  // text height instead of guessing fixed offsets - see
  // src/services/pdfCertificate.service.js.
  await t.test('stays on a single page even with a long, wrapping course title', async () => {
    const buf = await generateCertificatePDF({
      studentName: 'Maximilian Alexander Worthington-Smythe III',
      courseTitle: 'Advanced Data Structures, Algorithms, and Computational Complexity Theory',
      score: 100,
      issuedAt: new Date(),
      certificateId: 'cert-edge',
      verificationCode: 'CODEEDGE',
    });
    assert.equal(countPages(buf), 1, 'a wrapping course title must not push content onto a second page');
  });

  await t.test('stays on a single page for an extreme-length name and three-line title', async () => {
    const buf = await generateCertificatePDF({
      studentName: 'Dr. Wolfeschlegelsteinhausenbergerdorff Sr.',
      courseTitle:
        'A Comprehensive and Exhaustive Introduction to Distributed Systems, Consensus Protocols, and Fault-Tolerant Architecture Design',
      score: 87,
      issuedAt: new Date(),
      certificateId: 'cert-extreme',
      verificationCode: 'CODEEXTREME',
    });
    assert.equal(countPages(buf), 1);
  });
});

test('S3 URL signing (pure SigV4 - no network call)', async (t) => {
  await t.test('presigned upload URL is well-formed and signed', async () => {
    const url = await generatePresignedUploadUrl({ key: 'course-videos/test/abc.mp4', contentType: 'video/mp4' });
    assert.ok(url.startsWith('https://'));
    assert.ok(url.includes('X-Amz-Signature='));
    assert.ok(url.includes(process.env.AWS_S3_BUCKET));
  });

  await t.test('presigned view URL is well-formed and signed', async () => {
    const url = await generatePresignedViewUrl({ key: 'certificates/test/cert.pdf' });
    assert.ok(url.includes('X-Amz-Signature='));
  });
});
