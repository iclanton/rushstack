// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { FileSystem, JsonFile, JsonSchema } from '@rushstack/node-core-library';

import type { RushConfiguration } from './RushConfiguration';
import type { RushConfigurationProject } from './RushConfigurationProject';
import schemaJson from '../schemas/subspaces.schema.json';
import { RushConstants } from '../logic/RushConstants';

/**
 * The allowed naming convention for subspace names.
 * Allows for names to be formed of letters, numbers, and hyphens (-)
 */
export const SUBSPACE_NAME_REGEXP: RegExp = /^[a-z][a-z0-9]*([-][a-z0-9]+)*$/;

/**
 * This represents the JSON data structure for the "subspaces.json" configuration file.
 * See subspace.schema.json for documentation.
 */
interface ISubspaceConfigurationJson {
  enabled: boolean;
  splitWorkspaceCompatibility?: boolean;
  subspaceNames: string[];
}

/**
 * This represents the subspace configurations for a repository, based on the "subspaces.json"
 * configuration file.
 * @beta
 */
export class SubspaceConfiguration {
  private static _jsonSchema: JsonSchema = JsonSchema.fromLoadedObject(schemaJson);

  /**
   * The absolute path to the "subspaces.json" configuration file that was loaded to construct this object.
   */
  public readonly subspaceJsonFilePath: string;

  /**
   * Determines if the subspace feature is enabled
   */
  public readonly enabled: boolean;

  /**
   * This determines if the subspaces feature supports adding configuration files under the project folder itself
   */
  public readonly splitWorkspaceCompatibility: boolean;

  /**
   * A set of the available subspaces
   */
  public readonly subspaceNames: Set<string>;

  private constructor(configuration: Readonly<ISubspaceConfigurationJson>, subspaceJsonFilePath: string) {
    this.subspaceJsonFilePath = subspaceJsonFilePath;
    this.enabled = configuration.enabled;
    this.splitWorkspaceCompatibility = !!configuration.splitWorkspaceCompatibility;
    this.subspaceNames = new Set();
    for (const subspaceName of configuration.subspaceNames) {
      if (SUBSPACE_NAME_REGEXP.test(subspaceName)) {
        this.subspaceNames.add(subspaceName);
      } else {
        throw new Error(
          `Invalid subspace name: ${subspaceName}. Subspace names must only consist of lowercase letters, numbers, and hyphens (-).`
        );
      }
    }
    // Add the default subspace
    this.subspaceNames.add(RushConstants.defaultSubspaceName);
  }

  /**
   * Checks if the given subspace name is a registered subspace in the subspaces.json file.
   */
  public isValidSubspaceName(subspaceName: string): boolean {
    return this.subspaceNames.has(subspaceName);
  }

  public static tryLoadFromConfigurationFile(
    subspaceJsonFilePath: string
  ): SubspaceConfiguration | undefined {
    let configuration: Readonly<ISubspaceConfigurationJson> | undefined;
    try {
      configuration = JsonFile.loadAndValidate(subspaceJsonFilePath, SubspaceConfiguration._jsonSchema);
    } catch (e) {
      if (!FileSystem.isNotExistError(e)) {
        throw e;
      }
    }
    if (configuration) {
      return new SubspaceConfiguration(configuration, subspaceJsonFilePath);
    }
  }

  public static tryLoadFromDefaultLocation(
    rushConfiguration: RushConfiguration
  ): SubspaceConfiguration | undefined {
    const commonRushConfigFolder: string = rushConfiguration.getCommonRushConfigFolder();
    if (commonRushConfigFolder) {
      const subspaceJsonLocation: string = `${commonRushConfigFolder}/${RushConstants.subspacesConfigFilename}`;
      return SubspaceConfiguration.tryLoadFromConfigurationFile(subspaceJsonLocation);
    }
  }

  public static belongsInSubspace(rushProject: RushConfigurationProject, subspaceName: string): boolean {
    return (
      rushProject.subspaceName === subspaceName ||
      (!rushProject.subspaceName && subspaceName === RushConstants.defaultSubspaceName)
    );
  }
}
