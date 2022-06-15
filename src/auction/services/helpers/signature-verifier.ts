import { Injectable, UnauthorizedException } from '@nestjs/common';

import { signatureVerify } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';

type VerificationArgs = {
  payload?: string;
  signature?: string;
  signerAddress?: string;
};

@Injectable()
export class SignatureVerifier {
  async verify(args: VerificationArgs): Promise<void> {
    const { payload = '', signature = '', signerAddress = '' } = args;

    const signatureU8a = hexToU8a(signature);

    try {
      const verificationResult = await signatureVerify(payload, signatureU8a, signerAddress);

      if (!verificationResult.isValid) throw new Error('Bad signature');
    } catch (error) {
      const { message = 'no message' } = error;

      throw new UnauthorizedException({ status: 401, message, args });
    }
  }
}
