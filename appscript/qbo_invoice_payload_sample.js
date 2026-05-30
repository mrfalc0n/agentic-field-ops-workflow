/**
 * Sanitized Apps Script-style sample.
 * Demonstrates preparing an invoice payload from a structured job record.
 */

function buildInvoicePayloadSample(job) {
  const readiness = getInvoiceReadiness_(job);
  if (!readiness.ready) {
    throw new Error(`Job is not invoice-ready: ${readiness.missing.join(', ')}`);
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

function getInvoiceReadiness_(job) {
  const required = ['jobId', 'customerRef', 'serviceItemRef', 'invoiceNotes', 'amount'];
  const missing = required.filter((field) => !job[field]);

  if (job.invoiceNumber) {
    missing.push('invoiceNumber must be blank before invoice creation');
  }

  return {
    ready: missing.length === 0,
    missing
  };
}
