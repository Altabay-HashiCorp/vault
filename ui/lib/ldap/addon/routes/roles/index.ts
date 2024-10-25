/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: BUSL-1.1
 */

import LdapRolesRoute from '../roles';
import { service } from '@ember/service';
import { withConfig } from 'core/decorators/fetch-secrets-engine-config';
import { hash } from 'rsvp';

import type StoreService from 'vault/services/store';
import type Transition from '@ember/routing/transition';
import type LdapRoleModel from 'vault/models/ldap/role';
import type SecretEngineModel from 'vault/models/secret-engine';
import type Controller from '@ember/controller';
import type { Breadcrumb } from 'vault/vault/app-types';

interface LdapRolesIndexRouteModel {
  backendModel: SecretEngineModel;
  promptConfig: boolean;
  roles: Array<LdapRoleModel>;
}
interface LdapRolesController extends Controller {
  breadcrumbs: Array<Breadcrumb>;
  model: LdapRolesIndexRouteModel;
}

interface LdapRolesRouteParams {
  page?: string;
  pageFilter: string;
}

@withConfig('ldap/config')
export default class LdapRolesIndexRoute extends LdapRolesRoute {
  @service declare readonly store: StoreService; // for @withConfig decorator

  declare promptConfig: boolean;

  queryParams = {
    pageFilter: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
  };

  model(params: LdapRolesRouteParams) {
    const backendModel = this.modelFor('application') as SecretEngineModel;
    return hash({
      backendModel,
      promptConfig: this.promptConfig,
      roles: this.lazyQuery({ showPartialError: true }, backendModel.id, params),
    });
  }

  setupController(
    controller: LdapRolesController,
    resolvedModel: LdapRolesIndexRouteModel,
    transition: Transition
  ) {
    super.setupController(controller, resolvedModel, transition);

    controller.breadcrumbs = [
      { label: 'Secrets', route: 'secrets', linkExternal: true },
      { label: resolvedModel.backendModel.id, route: 'overview' },
      { label: 'Roles' },
    ];
  }

  resetController(controller: LdapRolesController, isExiting: boolean) {
    if (isExiting) {
      controller.set('pageFilter', undefined);
      controller.set('page', undefined);
    }
  }
}
