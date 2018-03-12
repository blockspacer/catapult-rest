const { sha3_256 } = require('js-sha3');
const Ripemd160 = require('ripemd160');
const array = require('../utils/array');
const base32 = require('../utils/base32');
const convert = require('../utils/convert');

const constants = {
	sizes: {
		ripemd160: 20,
		addressDecoded: 25,
		addressEncoded: 40,
		key: 32,
		checksum: 4
	}
};

/** @exports model/address */
const address = {
	/**
	 * Converts an encoded address string to a decoded address.
	 * @param {string} encoded The encoded address string.
	 * @returns {Uint8Array} The decoded address corresponding to the input.
	 */
	stringToAddress: encoded => {
		if (constants.sizes.addressEncoded !== encoded.length)
			throw Error(`${encoded} does not represent a valid encoded address`);

		return base32.decode(encoded);
	},

	/**
	 * Converts a decoded address to an encoded address string.
	 * @param {Uint8Array} decoded The decoded address.
	 * @returns {string} The encoded address string corresponding to the input.
	 */
	addressToString: decoded => {
		if (constants.sizes.addressDecoded !== decoded.length)
			throw Error(`${convert.uint8ToHex(decoded)} does not represent a valid decoded address`);

		return base32.encode(decoded);
	},

	/**
	 * Converts a public key to a decoded address for a specific network.
	 * @param {module:crypto/keyPair~PublicKey} publicKey The public key.
	 * @param {numeric} networkIdentifier The network identifier.
	 * @returns {Uint8Array} The decoded address corresponding to the inputs.
	 */
	publicKeyToAddress: (publicKey, networkIdentifier) => {
		// step 1: sha3 hash of the public key
		const publicKeyHash = sha3_256.arrayBuffer(publicKey);

		// step 2: ripemd160 hash of (1)
		const ripemdHash = new Ripemd160().update(Buffer.from(publicKeyHash)).digest();

		// step 3: add network identifier byte in front of (2)
		const decodedAddress = new Uint8Array(constants.sizes.addressDecoded);
		decodedAddress[0] = networkIdentifier;
		array.copy(decodedAddress, ripemdHash, constants.sizes.ripemd160, 1);

		// step 4: concatenate (3) and the checksum of (3)
		const hash = sha3_256.arrayBuffer(decodedAddress.subarray(0, constants.sizes.ripemd160 + 1));
		array.copy(decodedAddress, array.uint8View(hash), constants.sizes.checksum, constants.sizes.ripemd160 + 1);

		return decodedAddress;
	},

	/**
	 * Determines the validity of a decoded address.
	 * @param {Uint8Array} decoded The decoded address.
	 * @returns {boolean} true if the decoded address is valid, false otherwise.
	 */
	isValidAddress: decoded => {
		const hash = sha3_256.create();
		const checksumBegin = constants.sizes.addressDecoded - constants.sizes.checksum;
		hash.update(decoded.subarray(0, checksumBegin));
		const checksum = new Uint8Array(constants.sizes.checksum);
		array.copy(checksum, array.uint8View(hash.arrayBuffer()), constants.sizes.checksum);
		return array.deepEqual(checksum, decoded.subarray(checksumBegin));
	},

	/**
	 * Determines the validity of an encoded address string.
	 * @param {string} encoded The encoded address string.
	 * @returns {boolean} true if the encoded address string is valid, false otherwise.
	 */
	isValidEncodedAddress: encoded => {
		if (constants.sizes.addressEncoded !== encoded.length)
			return false;

		try {
			const decoded = address.stringToAddress(encoded);
			return address.isValidAddress(decoded);
		} catch (err) {
			return false;
		}
	}
};

module.exports = address;
