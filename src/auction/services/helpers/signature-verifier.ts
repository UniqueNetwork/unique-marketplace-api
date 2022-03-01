import { Injectable, UnauthorizedException } from "@nestjs/common";

import { signatureVerify } from '@polkadot/util-crypto';

type VerificationArgs = {
  payload?: string,
  signature?: string,
  signerAddress?: string,
}

@Injectable()
export class SignatureVerifier {
  async verify(args: VerificationArgs): Promise<void> {
    const { payload = '', signature = '', signerAddress = '' } = args;

    try {
      const verificationResult = await signatureVerify(payload, signature, signerAddress);

      if (!verificationResult.isValid) throw new Error('Bad signature');
    } catch (error) {
      const { message = 'no message' } = error;

      throw new UnauthorizedException({ status: 401, message, args });
    }
  }
}