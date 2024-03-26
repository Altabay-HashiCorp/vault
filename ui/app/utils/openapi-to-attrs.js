/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: BUSL-1.1
 */

import { attr } from '@ember-data/model';
import { camelize, capitalize } from '@ember/string';

export const expandOpenApiProps = function (props) {
  const attrs = {};
  // expand all attributes
  for (const propName in props) {
    const prop = props[propName];
    let { description, items, type, format, isId, deprecated } = prop;
    if (deprecated === true) {
      continue;
    }
    let {
      name,
      value,
      group,
      sensitive,
      editType,
      description: displayDescription,
    } = prop['x-vault-displayAttrs'] || {};

    if (type === 'integer') {
      type = 'number';
    }

    if (displayDescription) {
      description = displayDescription;
    }

    editType = editType || type;

    if (format === 'seconds' || format === 'duration') {
      editType = 'ttl';
    } else if (items) {
      editType = items.type + capitalize(type);
    }

    const attrDefn = {
      editType,
      helpText: description,
      possibleValues: prop['enum'],
      fieldValue: isId ? 'mutableId' : null,
      fieldGroup: group || 'default',
      readOnly: isId,
      defaultValue: value || null,
    };

    if (type === 'object' && !!value) {
      attrDefn.defaultValue = () => {
        return value;
      };
    }

    if (sensitive) {
      attrDefn.sensitive = true;
    }

    // only set a label if we have one from OpenAPI
    // otherwise the propName will be humanized by the form-field component
    if (name) {
      attrDefn.label = name;
    }

    // ttls write as a string and read as a number
    // so setting type on them runs the wrong transform
    if (editType !== 'ttl' && type !== 'array') {
      attrDefn.type = type;
    }

    // loop to remove empty vals
    for (const attrProp in attrDefn) {
      if (attrDefn[attrProp] == null) {
        delete attrDefn[attrProp];
      }
    }
    attrs[camelize(propName)] = attrDefn;
  }
  return attrs;
};

export const combineAttributes = function (oldAttrs, newProps) {
  const newAttrs = {};
  const newFields = [];
  if (oldAttrs) {
    oldAttrs.forEach(function (value, name) {
      if (newProps[name]) {
        newAttrs[name] = attr(newProps[name].type, { ...newProps[name], ...value.options });
      } else {
        newAttrs[name] = attr(value.type, value.options);
      }
    });
  }
  for (const prop in newProps) {
    if (newAttrs[prop]) {
      continue;
    } else {
      newAttrs[prop] = attr(newProps[prop].type, newProps[prop]);
      newFields.push(prop);
    }
  }
  return { attrs: newAttrs, newFields };
};

export const combineFieldGroups = function (currentGroups, newFields, excludedFields) {
  let allFields = [];
  for (const group of currentGroups) {
    const fieldName = Object.keys(group)[0];
    allFields = allFields.concat(group[fieldName]);
  }
  const otherFields = newFields.filter((field) => {
    return !allFields.includes(field) && !excludedFields.includes(field);
  });
  if (otherFields.length) {
    currentGroups[0].default = currentGroups[0].default.concat(otherFields);
  }

  return currentGroups;
};

export function helpUrlForModel(modelType, backend) {
  const helpUrlByType = {
    'auth-config': (backend) => `/v1/auth/${backend}/config?help=1`,
    'role-ssh': (backend) => `/v1/${backend}/roles/example?help=1`,
    'kmip/config': (backend) => `/v1/${backend}/config?help=1`,
    'kmip/role': (backend) => `/v1/${backend}/scope/example/role/example?help=1`,
    'pki/role': (backend) => `/v1/${backend}/roles/example?help=1`,
    'pki/sign-intermediate': (backend) => `/v1/${backend}/issuer/example/sign-intermediate?help=1`,
    'pki/tidy': (backend) => `/v1/${backend}/config/auto-tidy?help=1`,
    'pki/certificate/generate': (backend) => `/v1/${backend}/issue/example?help=1`,
    'pki/certificate/sign': (backend) => `/v1/${backend}/sign/example?help=1`,
    'pki/config/acme': (backend) => `/v1/${backend}/config/acme?help=1`,
    'pki/config/cluster': (backend) => `/v1/${backend}/config/cluster?help=1`,
    'pki/config/urls': (backend) => `/v1/${backend}/config/urls?help=1`,
  };
  const helpUrl = helpUrlByType[modelType];
  if (!helpUrl) return null;
  return helpUrl(backend);
}
