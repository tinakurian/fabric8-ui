import { EventEmitter, Inject, Injectable, OnDestroy } from '@angular/core';
import { Http } from '@angular/http';
import { ExtProfile, ExtUser, GettingStartedService } from '../../getting-started/services/getting-started.service';

import { cloneDeep } from 'lodash';
import { Logger } from 'ngx-base';
import { WIT_API_URL } from 'ngx-fabric8-wit';
import { AuthenticationService, UserService } from 'ngx-login-client';
import { Observable, Subscription } from 'rxjs';

/**
 * A service to manage the user acknowledgement to dismiss the warning displayed by the experimental feature banner
 */
@Injectable()
export class FeatureAcknowledgementService extends GettingStartedService implements OnDestroy {
  protected subscriptions: Subscription[] = [];
  showIconChanged = new EventEmitter();
  constructor(
    protected auth: AuthenticationService,
    protected http: Http,
    protected logger: Logger,
    protected userService: UserService,
    @Inject(WIT_API_URL) apiUrl: string) {
    super(auth, http, logger, userService, apiUrl);
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }

  /**
   * Returns user toggle-setting whether to display the feature-icon or not.
   *
   * @returns {boolean} True if the user want to see the icon showing the experimental features.
   */
  getToggle(): Observable<boolean> {
    return this.userService.loggedInUser
      .map(user => {
        let acknowledged: boolean = true;
        let profile;
        profile = cloneDeep(user) as ExtUser;
        if (profile.attributes !== undefined) {
          profile.attributes.contextInformation = (user as ExtUser).attributes.contextInformation || {};
          acknowledged = Boolean(profile.attributes.contextInformation.featureAcknowledgement);
        }
        return acknowledged;
      });
  }

  /**
   * Save user user toggle-setting.
   *
   * @param {boolean} value True if the user want to see the icon showing the experimental features.
   */
  setToggle(value: boolean): void {
    let profile = this.getTransientProfile();
    delete profile.featureLevel;
    profile.contextInformation.featureAcknowledgement = value;

    this.subscriptions.push(this.update(profile).subscribe(() => {
      // tell all component the show indicator value has chnaged
      this.showIconChanged.emit({value});
    }, error => {
      this.logger.error(`Failed to save acknowledge state: ${error}`);
    }));
  }

  // Private

  /**
   * Get transient profile with updated properties
   *
   * @returns {ExtProfile} The updated transient profile
   */
  private getTransientProfile(): ExtProfile {
    let profile = this.createTransientProfile();
    // Delete extra information that make the update fail if present
    delete profile.username;
    if (profile) {
      delete profile['registrationCompleted'];
    }

    return profile;
  }
}
