// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import fsx = require('fs-extra');

/** @public */
export function existsSync(): typeof fsx.existsSync {
  return fsx.existsSync;
}
