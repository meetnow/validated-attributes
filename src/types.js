//
//  types.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

export type ValidatorFn = (input: mixed) => boolean;
export type DefaultValue = (() => mixed) | mixed;
export type ElementValidatorFn = (element: mixed, index: number | string) => void;
export type ElementIterator = (input: any, elementValidator: ElementValidatorFn) => void;
