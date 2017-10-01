import { Injectable } from '@angular/core';
import { Observable, } from 'rxjs/Rx';
import {DeviceHelper, Device} from "../../helpers/device/device.helper";
import {OrientationHelper, Orientation} from "../../helpers/orientation/orientation.helper";
import {ScreenWidthHelper} from "../../helpers/screen-width/screen-width.helper";

export type ScreenWidth = 'small' | 'normal' | 'large';
export type Browser = 'chrome' | 'firefox';

export type AdaptiveRule = {name: string, conditions: AdaptiveConditions};

export interface AdaptiveConditions {
  devices?: [Device];
  minScreenWidth?: string | number;
  maxScreenWidth?: string | number;
  orientation?: Orientation;
  browsers?: [Browser];
  custom?: [boolean | Function | Observable<boolean> | Promise<boolean>];
  rule?: AdaptiveRule;
}

declare let window: any;

@Injectable()
export class AdaptiveService {
  public changes: Observable<[Device, ScreenWidth, Orientation]>;

  constructor
  (
    private deviceHelper: DeviceHelper,
    private orientationHelper: OrientationHelper,
    private screenWidthHelper: ScreenWidthHelper
  ) {}

  private customToObservable(custom: boolean | Observable<boolean> | Promise<boolean> | Function): Observable<boolean> {
    if (typeof custom === 'boolean') {
      return Observable.of(custom);
    } else if (custom instanceof Observable) {
      return custom;
    } else if (custom instanceof Promise) {
      return Observable.fromPromise(custom);
    } else if (typeof custom === 'function') {
      return Observable.of(custom());
    } else {
      throw new Error('Unable to convert variable of type ' + typeof custom + ' into boolean observable');
    }
  }

  public validate(conditions: AdaptiveConditions): Observable<boolean> {
    let activeConditions: Observable<boolean>[] = [];

    if (conditions.devices) {
      activeConditions.push(this.deviceHelper.validate(conditions.devices));
    }

    if (conditions.orientation) {
      activeConditions.push(this.orientationHelper.validate(conditions.orientation));
    }

    if (conditions.minScreenWidth) {
      activeConditions.push(this.screenWidthHelper.validateMin(conditions.minScreenWidth));
    }

    if (conditions.maxScreenWidth) {
      activeConditions.push(this.screenWidthHelper.validateMax(conditions.maxScreenWidth));
    }

    if (typeof conditions.custom !== 'undefined') {
      // If it's not an array already, convert it into an array
      if (!Array.isArray(conditions.custom)) {
        conditions.custom = [conditions.custom];
      }

      // For each custom condition, convert it to an observable and add it to the active conditions
      conditions.custom.forEach(custom => {
        activeConditions.push(this.customToObservable(custom));
      });
    }

    // Check that there no false results in any of the observables
    return Observable
      .combineLatest(activeConditions)
      .map((results) => results.indexOf(false) === -1);
  }
}
