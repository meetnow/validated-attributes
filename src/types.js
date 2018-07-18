//
//  types.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

/** @access public */
export type ValidatorFn = (input: mixed) => boolean;

/** @access public */
export type DefaultValue = (() => mixed) | mixed;

/** @access public */
export type ElementValidatorFn = (element: mixed, index: number | string) => void;

/** @access public */
export type ElementIterator = (input: any, elementValidator: ElementValidatorFn) => void;

/**
 Result of typeofPlus
 @access public
 */
export type DetailedType =
  | 'undefined'
  | 'number'
  | 'boolean'
  | 'string'
  | 'function'
  | 'regexp'
  | 'array'
  | 'date'
  | 'error'
  | 'null'
  | 'symbol'
  | 'object';
