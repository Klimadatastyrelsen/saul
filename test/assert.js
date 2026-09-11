import assert from 'node:assert'; // https://nodejs.org/api/assert.html

/**
 * @class Assert
 * @param {AssertOptions} [options] - Optional configuration for assertions, see node:assert.Assert.
 * @throws {ERR_CONSTRUCT_CALL_REQUIRED} If not called with `new`.
 */
export class Assert extends assert.Assert {
    constructor(options) {
        super(options);
    }

    /**
     * Test for approximate equality.
     * @param {(number | Array<number>} actual
     * @param {(number | Array<number>} expected
     * @param {number} [tolerance] Allowed deviation (default 0.5).
     * @param {string | Error | MessageFactory} [message]
     * @returns {number} Difference between actual and expected value.
     */
    almostEqual(actual, expected, tolerance = 0.5, ...message) {
        if (arguments.length < 2) {
            throw new ERR_MISSING_ARGS('actual', 'expected');
        }
        const diff = [];
        if (expected instanceof Array) {
            for (let i = 0; i < expected.length; i++) {
                diff[i] = Math.abs(actual[i] - expected[i]);
            }
        } else {
            diff[0] = Math.abs(actual - expected);
        }
        const maxdiff = Math.max(...diff);
        if (maxdiff <= tolerance) {
            return maxdiff;
        } else {
            try {
                if (arguments.length < 4) {
                    message[0] = 'Expected values to be almost equal:';
                }
                this.deepStrictEqual(actual, expected, ...message);
            } catch (err) {
                err.operator = `tolerance ${tolerance}`;
                throw err;
            }
        }
    }
}