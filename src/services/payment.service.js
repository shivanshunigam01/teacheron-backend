import Payment from '../models/Payment.model.js';export async function createPayment(data){return Payment.create({...data,status:'paid',invoiceId:`INV-${Date.now()}`});}
