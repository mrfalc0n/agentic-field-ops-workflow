/**
 * Sanitized Apps Script-style sample.
 * Demonstrates preparing an invoice payload from a structured job record.
 */

function buildInvoicePayloadSample(job) {
  if (!job.customerRef || !job.serviceItemRef || !job.invoiceNotes) {
    throw new Error('Job is not invoice-ready.');
  }

  return {
    CustomerRef: {
      value: job.customerRef
    },
    Line: [
      {
        DetailType: 'SalesItemLineDetail',
        Amount: Number(job.amount || 0),
        Description: job.invoiceNotes,
        SalesItemLineDetail: {
          ItemRef: {
            value: job.serviceItemRef
          }
        }
      }
    ],
    PrivateNote: `Created from approved job ${job.jobId}`
  };
}
