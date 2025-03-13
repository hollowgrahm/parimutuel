// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

library Array {
    function remove(address[] storage self, address key) internal {
        for (uint i = 0; i < self.length; i++) {
            if (self[i] == key) {
                self[i] = self[self.length - 1];
                self.pop();
                break;
            }
        }
    }
}
