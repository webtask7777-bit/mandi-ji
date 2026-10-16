import { Router } from 'express';

const router = Router();

// Keep every old payment URL inert, including webhook deliveries and unknown
// subpaths. SahiBhav is free; this router must not read or change billing data.
router.use((_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(410).json({
    code: 'PAYMENT_DISABLED',
    free: true,
    message: 'सही भाव की सभी सुविधाएँ मुफ़्त हैं। भुगतान और सदस्यता बंद हैं।',
  });
});

export default router;
