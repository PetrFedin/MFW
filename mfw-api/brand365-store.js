'use strict';

function camelBrand(row){
  if(!row)return null;
  return {
    id:row.external_key||row.slug||String(row.id),
    storageId:String(row.id),
    slug:row.slug,
    name:row.name,
    city:row.city,
    country:row.country,
    description:row.description,
    website:row.website,
    status:row.status,
    metadata:row.metadata||{}
  };
}
function camelChannel(row){
  if(!row)return null;
  return {
    id:row.external_key||String(row.id),
    storageId:String(row.id),
    ownerType:row.owner_type,
    brandId:row.brand_external_key||row.brand_slug||null,
    storageBrandId:row.brand_id?String(row.brand_id):null,
    platform:row.platform,
    externalChannelId:row.external_channel_id,
    handle:row.handle,
    url:row.url,
    verificationMode:row.verification_mode,
    status:row.status,
    verifiedAt:row.verified_at,
    metadata:row.metadata||{}
  };
}
function camelMembership(row){
  if(!row)return null;
  return {
    id:String(row.id),
    userId:String(row.user_id),
    channelId:row.channel_external_key||String(row.channel_id),
    storageChannelId:String(row.channel_id),
    platform:row.platform,
    status:row.status,
    firstVerifiedAt:row.first_verified_at,
    providerJoinedAt:row.provider_joined_at,
    continuousSince:row.continuous_since,
    lastVerifiedAt:row.last_verified_at,
    lastLostAt:row.last_lost_at,
    proofSource:row.proof_source,
    proofDigest:row.proof_digest,
    metadata:row.metadata||{}
  };
}
function camelOffer(row,requirements){
  if(!row)return null;
  return {
    id:row.external_key||String(row.id),
    storageId:String(row.id),
    brandId:row.brand_external_key||row.brand_slug||String(row.brand_id),
    storageBrandId:String(row.brand_id),
    titleRu:row.title_ru,
    titleEn:row.title_en,
    descriptionRu:row.description_ru,
    descriptionEn:row.description_en,
    rewardType:row.reward_type,
    rewardValue:row.reward_value==null?null:Number(row.reward_value),
    rewardCurrency:row.reward_currency,
    minContinuousDays:Number(row.min_continuous_days||0),
    stockLimit:row.stock_limit==null?null:Number(row.stock_limit),
    perUserLimit:Number(row.per_user_limit||1),
    startsAt:row.starts_at,
    endsAt:row.ends_at,
    status:row.status,
    termsRu:row.terms_ru,
    termsEn:row.terms_en,
    audienceScope:row.audience_scope||{kind:'all_mfw'},
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    requirements:(requirements||[]).map(r=>({
      id:String(r.id),
      type:r.requirement_type,
      channelId:r.channel_external_key||r.channel_id&&String(r.channel_id)||null,
      storageChannelId:r.channel_id?String(r.channel_id):null,
      minContinuousDays:Number(r.min_continuous_days||0),
      required:r.required!==false,
      sortOrder:Number(r.sort_order||100),
      metadata:r.metadata||{}
    }))
  };
}
function camelPost(row){
  if(!row)return null;
  return {
    id:row.external_key||String(row.id),
    storageId:String(row.id),
    brandId:row.brand_external_key||row.brand_slug||String(row.brand_id),
    storageBrandId:String(row.brand_id),
    kind:row.kind,
    titleRu:row.title_ru,
    titleEn:row.title_en,
    bodyRu:row.body_ru,
    bodyEn:row.body_en,
    imageUrl:row.image_url,
    ctaLabelRu:row.cta_label_ru,
    ctaLabelEn:row.cta_label_en,
    ctaUrl:row.cta_url,
    eventStartsAt:row.event_starts_at,
    eventEndsAt:row.event_ends_at,
    audienceScope:row.audience_scope||{kind:'brand_followers'},
    placementScope:row.placement_scope||['brand_profile','discover_feed'],
    isPaid:!!row.is_paid,
    sponsorLabelRu:row.sponsor_label_ru,
    sponsorLabelEn:row.sponsor_label_en,
    frequencyCap:row.frequency_cap||{per_user_per_7d:2},
    status:row.status,
    moderationNote:row.moderation_note,
    publishedAt:row.published_at,
    createdAt:row.created_at,
    updatedAt:row.updated_at
  };
}

class Brand365Store{
  constructor({pool,memory}){
    this.pool=pool||null;
    this.memory=memory;
  }
  get persistent(){return !!this.pool;}

  async brandByRef(ref){
    ref=String(ref||'');
    if(!this.pool)return this.memory.brands.find(x=>x.id===ref||x.slug===ref)||null;
    const r=await this.pool.query(`SELECT * FROM brands
      WHERE external_key=$1 OR slug=$1 OR id::text=$1 LIMIT 1`,[ref]);
    return camelBrand(r.rows[0]);
  }

  async channelByRef(ref){
    ref=String(ref||'');
    if(!this.pool)return this.memory.socialChannels.find(x=>x.id===ref)||null;
    const r=await this.pool.query(`SELECT c.*,b.external_key brand_external_key,b.slug brand_slug
      FROM brand_social_channels c LEFT JOIN brands b ON b.id=c.brand_id
      WHERE c.external_key=$1 OR c.id::text=$1 LIMIT 1`,[ref]);
    return camelChannel(r.rows[0]);
  }

  async channelByProviderId(platform,externalChannelId){
    if(!this.pool)return this.memory.socialChannels.find(x=>x.platform===platform&&String(x.externalChannelId)===String(externalChannelId))||null;
    const r=await this.pool.query(`SELECT c.*,b.external_key brand_external_key,b.slug brand_slug
      FROM brand_social_channels c LEFT JOIN brands b ON b.id=c.brand_id
      WHERE c.platform=$1 AND c.external_channel_id=$2 LIMIT 1`,[String(platform),String(externalChannelId)]);
    return camelChannel(r.rows[0]);
  }

  async socialConnection(userId,platform){
    if(!this.pool)return this.memory.socialConnections.get(String(userId)+':'+String(platform))||null;
    const r=await this.pool.query(`SELECT * FROM social_connections
      WHERE user_id=$1 AND platform=$2 AND status='active'
      ORDER BY connected_at DESC LIMIT 1`,[userId,platform]);
    if(!r.rowCount)return null;
    const x=r.rows[0];
    return {id:String(x.id),userId:String(x.user_id),platform:x.platform,externalUserId:x.external_user_id,externalHandle:x.external_handle,status:x.status,scopes:x.scopes||[],connectedAt:x.connected_at,lastSyncedAt:x.last_synced_at};
  }

  async socialConnectionByExternalId(platform,externalUserId){
    if(!this.pool)return [...this.memory.socialConnections.values()].find(x=>x.platform===platform&&String(x.externalUserId)===String(externalUserId))||null;
    const r=await this.pool.query(`SELECT * FROM social_connections
      WHERE platform=$1 AND external_user_id=$2 AND status='active'
      ORDER BY connected_at DESC LIMIT 1`,[platform,String(externalUserId)]);
    if(!r.rowCount)return null;
    const x=r.rows[0];
    return {id:String(x.id),userId:String(x.user_id),platform:x.platform,externalUserId:x.external_user_id,externalHandle:x.external_handle,status:x.status,scopes:x.scopes||[],connectedAt:x.connected_at,lastSyncedAt:x.last_synced_at};
  }

  async demoSocialConnect(userId,platform,externalUserId,externalHandle){
    if(!this.pool){
      const item={id:'soc_'+Math.random().toString(16).slice(2),userId:String(userId),platform,externalUserId:String(externalUserId),externalHandle:String(externalHandle||''),status:'active',connectedAt:new Date().toISOString(),demo:true};
      this.memory.socialConnections.set(String(userId)+':'+platform,item);
      return item;
    }
    await this.pool.query(`UPDATE social_connections SET status='revoked'
      WHERE user_id=$1 AND platform=$2 AND status='active'`,[userId,platform]);
    const r=await this.pool.query(`INSERT INTO social_connections(user_id,platform,external_user_id,external_handle,status,scopes,last_synced_at)
      VALUES($1,$2,$3,$4,'active','[]'::jsonb,now())
      ON CONFLICT(user_id,platform,external_user_id)
      DO UPDATE SET external_handle=EXCLUDED.external_handle,status='active',last_synced_at=now()
      RETURNING *`,[userId,platform,String(externalUserId),String(externalHandle||'')]);
    const x=r.rows[0];
    return {id:String(x.id),userId:String(x.user_id),platform:x.platform,externalUserId:x.external_user_id,externalHandle:x.external_handle,status:x.status,connectedAt:x.connected_at,lastSyncedAt:x.last_synced_at};
  }

  async setBrandFollow(userId,brandRef,following){
    if(!this.pool){
      const set=this.memory.brandFollows.get(String(userId))||new Set();
      if(!this.memory.brandFollowStartedAt)this.memory.brandFollowStartedAt=new Map();
      const key=String(userId)+':'+String(brandRef);
      if(following){
        set.add(String(brandRef));
        if(!this.memory.brandFollowStartedAt.has(key))this.memory.brandFollowStartedAt.set(key,new Date().toISOString());
      }else{
        set.delete(String(brandRef));
        this.memory.brandFollowStartedAt.delete(key);
      }
      this.memory.brandFollows.set(String(userId),set);
      return !!following;
    }
    const brand=await this.brandByRef(brandRef);
    if(!brand)throw Object.assign(new Error('brand_not_found'),{code:'brand_not_found'});
    if(following){
      await this.pool.query(`INSERT INTO brand_follows(user_id,brand_id) VALUES($1,$2)
        ON CONFLICT(user_id,brand_id) DO NOTHING`,[userId,brand.storageId]);
    }else{
      await this.pool.query('DELETE FROM brand_follows WHERE user_id=$1 AND brand_id=$2',[userId,brand.storageId]);
    }
    return !!following;
  }

  async brandFollowRefs(userId){
    if(!this.pool)return new Set([...(this.memory.brandFollows.get(String(userId))||new Set())]);
    const r=await this.pool.query(`SELECT COALESCE(b.external_key,b.slug,b.id::text) ref
      FROM brand_follows f JOIN brands b ON b.id=f.brand_id WHERE f.user_id=$1`,[userId]);
    return new Set(r.rows.map(x=>String(x.ref)));
  }

  async isBrandFollow(userId,brandRef){
    const refs=await this.brandFollowRefs(userId);
    return refs.has(String(brandRef));
  }

  async registerInstallation(userId,{installationId,platform}){
    if(!this.pool){
      const item={userId:String(userId),installationId,platform,status:'active',installedAt:new Date().toISOString()};
      this.memory.appInstallations.set(String(userId),item);
      return item;
    }
    const r=await this.pool.query(`INSERT INTO app_installations(user_id,installation_id,platform,status,last_seen_at)
      VALUES($1,$2,$3,'active',now())
      ON CONFLICT(installation_id)
      DO UPDATE SET user_id=EXCLUDED.user_id,platform=EXCLUDED.platform,status='active',last_seen_at=now()
      RETURNING *`,[userId,installationId,platform]);
    const x=r.rows[0];
    return {userId:String(x.user_id),installationId:x.installation_id,platform:x.platform,status:x.status,installedAt:x.installed_at,lastSeenAt:x.last_seen_at};
  }

  async hasActiveInstallation(userId){
    if(!this.pool){
      const x=this.memory.appInstallations.get(String(userId));
      return !!(x&&x.status==='active');
    }
    const r=await this.pool.query(`SELECT 1 FROM app_installations
      WHERE user_id=$1 AND status='active' LIMIT 1`,[userId]);
    return !!r.rowCount;
  }

  async grantBrandAccess(userId,brandRef,role='manager'){
    if(!this.pool){
      const set=this.memory.brandAccess.get(String(userId))||new Set();
      set.add(String(brandRef));this.memory.brandAccess.set(String(userId),set);return true;
    }
    const brand=await this.brandByRef(brandRef);
    if(!brand)return false;
    await this.pool.query(`INSERT INTO brand_access(user_id,brand_id,access_role,status)
      VALUES($1,$2,$3,'active')
      ON CONFLICT(user_id,brand_id) DO UPDATE SET access_role=EXCLUDED.access_role,status='active',updated_at=now()`,[userId,brand.storageId,role]);
    return true;
  }

  async hasBrandAccess(userId,brandRef){
    if(!this.pool){
      const set=this.memory.brandAccess.get(String(userId));
      return !!(set&&set.has(String(brandRef)));
    }
    const brand=await this.brandByRef(brandRef);
    if(!brand)return false;
    const r=await this.pool.query(`SELECT 1 FROM brand_access
      WHERE user_id=$1 AND brand_id=$2 AND status='active' LIMIT 1`,[userId,brand.storageId]);
    return !!r.rowCount;
  }

  async channelsForBrand(brandRef){
    if(!this.pool)return this.memory.socialChannels.filter(x=>x.ownerType==='mfw'||x.brandId===String(brandRef));
    const brand=await this.brandByRef(brandRef);
    if(!brand)return [];
    const r=await this.pool.query(`SELECT c.*,b.external_key brand_external_key,b.slug brand_slug
      FROM brand_social_channels c LEFT JOIN brands b ON b.id=c.brand_id
      WHERE c.owner_type='mfw' OR c.brand_id=$1
      ORDER BY c.owner_type DESC,c.platform,c.handle`,[brand.storageId]);
    return r.rows.map(camelChannel);
  }

  async membershipsForUser(userId,channels){
    if(!this.pool){
      return channels.map(ch=>({channel:ch,membership:this.memory.socialMemberships.get(String(userId)+':'+String(ch.id))||null}));
    }
    const ids=channels.map(x=>x.storageId).filter(Boolean);
    if(!ids.length)return channels.map(channel=>({channel,membership:null}));
    const r=await this.pool.query(`SELECT m.*,c.external_key channel_external_key,c.platform
      FROM social_memberships m JOIN brand_social_channels c ON c.id=m.channel_id
      WHERE m.user_id=$1 AND m.channel_id=ANY($2::uuid[])`,[userId,ids]);
    const by=new Map(r.rows.map(x=>[String(x.channel_id),camelMembership(x)]));
    return channels.map(channel=>({channel,membership:by.get(String(channel.storageId))||null}));
  }

  async applyMembershipObservation(userId,channel,result,providerEventAt){
    if(!this.pool){
      const key=String(userId)+':'+String(channel.id);
      const prior=this.memory.socialMemberships.get(key)||null;
      const now=new Date().toISOString();
      const active=!!result.active;
      const eventIso=providerEventAt?new Date(providerEventAt).toISOString():null;
      const continuousSince=active?((prior&&prior.status==='active'&&(prior.continuousSince||prior.firstVerifiedAt))||eventIso||now):null;
      const item={id:prior?.id||('sm_'+Math.random().toString(16).slice(2)),userId:String(userId),channelId:channel.id,platform:channel.platform,status:active?'active':'inactive',firstVerifiedAt:prior?.firstVerifiedAt||(active?now:null),providerJoinedAt:eventIso||prior?.providerJoinedAt||null,continuousSince,lastVerifiedAt:now,lastLostAt:active?(prior?.lastLostAt||null):now,proofSource:result.source||channel.verificationMode,providerStatus:result.rawStatus??null,demo:!!result.demo};
      this.memory.socialMemberships.set(key,item);return item;
    }
    const channelStorageId=channel.storageId||String(channel.id);
    const active=!!result.active;
    const eventIso=providerEventAt?new Date(providerEventAt).toISOString():null;
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const prior=await client.query(`SELECT * FROM social_memberships
        WHERE user_id=$1 AND channel_id=$2 FOR UPDATE`,[userId,channelStorageId]);
      const p=prior.rows[0]||null;
      const firstVerified=p&&p.first_verified_at|| (active?new Date():null);
      const continuous=active?((p&&p.status==='active'&&(p.continuous_since||p.first_verified_at))||eventIso||new Date()):null;
      const providerJoined=eventIso||(p&&p.provider_joined_at)||null;
      const lastLost=active?(p&&p.last_lost_at||null):new Date();
      const r=await client.query(`INSERT INTO social_memberships(
          user_id,channel_id,status,first_verified_at,provider_joined_at,continuous_since,last_verified_at,last_lost_at,proof_source,metadata)
        VALUES($1,$2,$3,$4,$5,$6,now(),$7,$8,$9)
        ON CONFLICT(user_id,channel_id) DO UPDATE SET
          status=EXCLUDED.status,
          first_verified_at=COALESCE(social_memberships.first_verified_at,EXCLUDED.first_verified_at),
          provider_joined_at=COALESCE(EXCLUDED.provider_joined_at,social_memberships.provider_joined_at),
          continuous_since=EXCLUDED.continuous_since,
          last_verified_at=now(),
          last_lost_at=EXCLUDED.last_lost_at,
          proof_source=EXCLUDED.proof_source,
          metadata=EXCLUDED.metadata
        RETURNING *`,[
          userId,channelStorageId,active?'active':'inactive',firstVerified,providerJoined,continuous,lastLost,
          result.source||channel.verificationMode,JSON.stringify({providerStatus:result.rawStatus??null,demo:!!result.demo})
        ]);
      await client.query(`INSERT INTO social_membership_observations(membership_id,is_active,provider_joined_at,source,metadata)
        VALUES($1,$2,$3,$4,$5)`,[r.rows[0].id,active,eventIso,result.source||channel.verificationMode,JSON.stringify({providerStatus:result.rawStatus??null,demo:!!result.demo})]);
      await client.query('COMMIT');
      return camelMembership({...r.rows[0],channel_external_key:channel.id,platform:channel.platform});
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }

  async activeMembershipCandidates(limit=250){
    if(!this.pool){
      return [...this.memory.socialMemberships.values()].filter(x=>x.status==='active').slice(0,limit).map(m=>({
        membership:m,
        channel:this.memory.socialChannels.find(x=>x.id===m.channelId)||null
      }));
    }
    const r=await this.pool.query(`SELECT m.*,c.external_key channel_external_key,c.owner_type,c.brand_id,c.platform,c.external_channel_id,c.handle,c.url,c.verification_mode,c.status channel_status,b.external_key brand_external_key,b.slug brand_slug
      FROM social_memberships m
      JOIN brand_social_channels c ON c.id=m.channel_id
      LEFT JOIN brands b ON b.id=c.brand_id
      WHERE m.status='active' AND c.status='active'
      ORDER BY m.last_verified_at NULLS FIRST
      LIMIT $1`,[limit]);
    return r.rows.map(x=>({
      membership:camelMembership(x),
      channel:camelChannel({
        id:x.channel_id,external_key:x.channel_external_key,owner_type:x.owner_type,brand_id:x.brand_id,
        platform:x.platform,external_channel_id:x.external_channel_id,handle:x.handle,url:x.url,
        verification_mode:x.verification_mode,status:x.channel_status,brand_external_key:x.brand_external_key,brand_slug:x.brand_slug
      })
    }));
  }

  async beginReverificationRun(triggerSource){
    if(!this.pool)return {id:null,triggerSource,status:'running'};
    const r=await this.pool.query(`INSERT INTO social_reverification_runs(trigger_source,status)
      VALUES($1,'running') RETURNING id,started_at`,[triggerSource]);
    return {id:String(r.rows[0].id),triggerSource,status:'running',startedAt:r.rows[0].started_at};
  }
  async finishReverificationRun(run,result){
    if(!this.pool||!run||!run.id)return;
    const status=result.errors&&result.errors.length?(result.checked?'partial':'failed'):'completed';
    await this.pool.query(`UPDATE social_reverification_runs SET
      status=$2,checked_count=$3,active_count=$4,inactive_count=$5,skipped_count=$6,error_count=$7,summary=$8,completed_at=now()
      WHERE id=$1`,[run.id,status,result.checked||0,result.active||0,result.inactive||0,result.skipped||0,(result.errors||[]).length,JSON.stringify(result)]);
  }

  async offersForBrand(brandRef,{publishedOnly=false}={}){
    if(!this.pool){
      return this.memory.loyaltyOffers.filter(x=>x.brandId===String(brandRef)&&(!publishedOnly||x.status==='published'));
    }
    const brand=await this.brandByRef(brandRef);
    if(!brand)return [];
    const params=[brand.storageId];let filter='';
    if(publishedOnly)filter=" AND o.status='published'";
    const r=await this.pool.query(`SELECT o.*,b.external_key brand_external_key,b.slug brand_slug
      FROM loyalty_offers o JOIN brands b ON b.id=o.brand_id
      WHERE o.brand_id=$1${filter} ORDER BY o.created_at DESC`,params);
    const ids=r.rows.map(x=>String(x.id));
    let reqs=[];
    if(ids.length){
      const q=await this.pool.query(`SELECT r.*,c.external_key channel_external_key
        FROM loyalty_offer_requirements r LEFT JOIN brand_social_channels c ON c.id=r.channel_id
        WHERE r.offer_id=ANY($1::uuid[]) ORDER BY r.sort_order,r.id`,[ids]);
      reqs=q.rows;
    }
    return r.rows.map(row=>camelOffer(row,reqs.filter(x=>String(x.offer_id)===String(row.id))));
  }

  async offerByRef(ref){
    if(!this.pool)return this.memory.loyaltyOffers.find(x=>x.id===String(ref))||null;
    const r=await this.pool.query(`SELECT o.*,b.external_key brand_external_key,b.slug brand_slug
      FROM loyalty_offers o JOIN brands b ON b.id=o.brand_id
      WHERE o.external_key=$1 OR o.id::text=$1 LIMIT 1`,[String(ref)]);
    if(!r.rowCount)return null;
    const req=await this.pool.query(`SELECT r.*,c.external_key channel_external_key
      FROM loyalty_offer_requirements r LEFT JOIN brand_social_channels c ON c.id=r.channel_id
      WHERE r.offer_id=$1 ORDER BY r.sort_order,r.id`,[r.rows[0].id]);
    return camelOffer(r.rows[0],req.rows);
  }

  async evaluateOffer(userId,offer){
    if(!this.pool)return null;
    const user=await this.pool.query('SELECT 1 FROM users WHERE id=$1 AND status=\'active\' LIMIT 1',[userId]);
    const install=await this.hasActiveInstallation(userId);
    const followed=await this.brandFollowRefs(userId);
    const progress=[];
    for(const req of offer.requirements||[]){
      let ok=false,currentDays=0,detail='';
      if(req.type==='registered_user'){ok=!!user.rowCount;detail=ok?'registered':'mfw_id_required';}
      else if(req.type==='app_installed'){ok=install;detail=ok?'active_installation':'install_required';}
      else if(req.type==='brand_follow_in_mfw'){ok=followed.has(String(offer.brandId));detail=ok?'following_in_mfw':'follow_brand_in_mfw';}
      else if(req.type==='mfw_social_follow'||req.type==='brand_social_follow'){
        const ch=await this.channelByRef(req.channelId);
        if(ch){
          const r=await this.pool.query(`SELECT status,continuous_since FROM social_memberships
            WHERE user_id=$1 AND channel_id=$2 LIMIT 1`,[userId,ch.storageId]);
          if(r.rowCount){
            const m=r.rows[0];
            currentDays=m.status==='active'&&m.continuous_since?Math.max(0,Math.floor((Date.now()-new Date(m.continuous_since).getTime())/86400000)):0;
            ok=m.status==='active'&&currentDays>=Number(req.minContinuousDays||0);
            detail=m.status;
          }else detail='verification_required';
        }else detail='channel_missing';
      }
      progress.push({...req,ok,currentDays,detail});
    }
    const eligible=progress.filter(x=>x.required!==false).every(x=>x.ok);
    const status=eligible?'eligible':'progress';
    await this.pool.query(`INSERT INTO loyalty_eligibility(user_id,offer_id,status,progress,qualified_at,last_evaluated_at)
      VALUES($1,$2,$3,$4,$5,now())
      ON CONFLICT(user_id,offer_id) DO UPDATE SET
        status=EXCLUDED.status,progress=EXCLUDED.progress,
        qualified_at=CASE WHEN EXCLUDED.status='eligible' THEN COALESCE(loyalty_eligibility.qualified_at,now()) ELSE loyalty_eligibility.qualified_at END,
        last_evaluated_at=now()`,[userId,offer.storageId,status,JSON.stringify(progress),eligible?new Date():null]);
    return {offerId:offer.id,userId:String(userId),status,eligible,progress,evaluatedAt:new Date().toISOString()};
  }

  async createClaim(userId,offer,tokenHash,expiresAt){
    if(!this.pool)return null;
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const existing=await client.query(`SELECT * FROM loyalty_claims
        WHERE user_id=$1 AND offer_id=$2 AND status IN ('issued','redeemed')
        ORDER BY issued_at DESC LIMIT 1 FOR UPDATE`,[userId,offer.storageId]);
      if(existing.rowCount){await client.query('COMMIT');return {existing:true,claim:existing.rows[0]};}
      if(offer.stockLimit!=null){
        const stock=await client.query(`SELECT count(*)::int n FROM loyalty_claims
          WHERE offer_id=$1 AND status IN ('issued','redeemed')`,[offer.storageId]);
        if(Number(stock.rows[0].n)>=Number(offer.stockLimit)){await client.query('ROLLBACK');return {stockExhausted:true};}
      }
      const r=await client.query(`INSERT INTO loyalty_claims(user_id,offer_id,claim_token_hash,status,expires_at,metadata)
        VALUES($1,$2,$3,'issued',$4,'{}'::jsonb) RETURNING *`,[userId,offer.storageId,tokenHash,expiresAt]);
      await client.query('COMMIT');return {existing:false,claim:r.rows[0]};
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }

  async claimByHash(hash){
    if(!this.pool)return null;
    const r=await this.pool.query(`SELECT c.*,o.external_key offer_external_key,o.brand_id,b.external_key brand_external_key,b.slug brand_slug,
      o.reward_type,o.reward_value,o.status offer_status
      FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id JOIN brands b ON b.id=o.brand_id
      WHERE c.claim_token_hash=$1 LIMIT 1`,[hash]);
    return r.rows[0]||null;
  }
  async updateClaimStatus(claimId,status,redeemedBy){
    if(!this.pool)return null;
    const r=await this.pool.query(`UPDATE loyalty_claims SET status=$2,
      redeemed_at=CASE WHEN $2='redeemed' THEN now() ELSE redeemed_at END,
      redeemed_by=CASE WHEN $2='redeemed' THEN $3 ELSE redeemed_by END
      WHERE id=$1 RETURNING *`,[claimId,status,redeemedBy||null]);
    return r.rows[0]||null;
  }
  async revokeIssuedClaimsIfIneligible(userId){
    if(!this.pool)return 0;
    const r=await this.pool.query(`SELECT c.id,o.external_key offer_ref
      FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id
      WHERE c.user_id=$1 AND c.status='issued'`,[userId]);
    let n=0;
    for(const row of r.rows){
      const offer=await this.offerByRef(row.offer_ref);
      const ev=await this.evaluateOffer(userId,offer);
      if(!ev.eligible){await this.updateClaimStatus(row.id,'revoked');n++;}
    }
    return n;
  }

  async postsForBrand(brandRef,{publishedOnly=true}={}){
    if(!this.pool)return this.memory.brandPosts.filter(x=>x.brandId===String(brandRef)&&(!publishedOnly||x.status==='published')).sort((a,b)=>String(b.publishedAt||b.createdAt||'').localeCompare(String(a.publishedAt||a.createdAt||'')));
    const brand=await this.brandByRef(brandRef);if(!brand)return [];
    const r=await this.pool.query(`SELECT p.*,b.external_key brand_external_key,b.slug brand_slug
      FROM brand_content_posts p JOIN brands b ON b.id=p.brand_id
      WHERE p.brand_id=$1 ${publishedOnly?"AND p.status='published'":''}
      ORDER BY COALESCE(p.published_at,p.created_at) DESC`,[brand.storageId]);
    return r.rows.map(camelPost);
  }

  async createPost(brandRef,b){
    if(!this.pool)return null;
    const brand=await this.brandByRef(brandRef);if(!brand)return null;
    const paid=!!b.isPaid||((b.audienceScope&&b.audienceScope.kind)==='all_mfw');
    const externalKey='bp_'+Date.now().toString(36)+'_'+Math.random().toString(16).slice(2,8);
    const r=await this.pool.query(`INSERT INTO brand_content_posts(
      brand_id,external_key,kind,title_ru,title_en,body_ru,body_en,image_url,cta_label_ru,cta_label_en,cta_url,
      event_starts_at,event_ends_at,audience_scope,placement_scope,is_paid,sponsor_label_ru,sponsor_label_en,status,published_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,[
        brand.storageId,externalKey,String(b.kind||'news'),String(b.titleRu||'Новости бренда'),String(b.titleEn||'Brand news'),
        String(b.bodyRu||''),String(b.bodyEn||''),String(b.imageUrl||''),String(b.ctaLabelRu||'Открыть'),String(b.ctaLabelEn||'Open'),String(b.ctaUrl||'#'),
        b.eventStartsAt||null,b.eventEndsAt||null,b.audienceScope||{kind:'brand_followers'},b.placementScope||['brand_profile','discover_feed'],paid,
        paid?'Реклама бренда':null,paid?'Brand promotion':null,paid?'pending_review':'published',paid?null:new Date()
      ]);
    return camelPost({...r.rows[0],brand_external_key:brand.id,brand_slug:brand.slug});
  }

  async createOffer(brandRef,b){
    if(!this.pool)return null;
    const brand=await this.brandByRef(brandRef);if(!brand)return null;
    const externalKey='lo_'+Date.now().toString(36)+'_'+Math.random().toString(16).slice(2,8);
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const r=await client.query(`INSERT INTO loyalty_offers(
        brand_id,external_key,title_ru,title_en,description_ru,description_en,reward_type,reward_value,min_continuous_days,status,stock_limit,per_user_limit,terms_ru,terms_en)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12,$13) RETURNING *`,[
          brand.storageId,externalKey,String(b.titleRu||'Новая привилегия'),String(b.titleEn||'New reward'),
          String(b.descriptionRu||''),String(b.descriptionEn||''),String(b.rewardType||'discount_percent'),
          b.rewardValue==null?null:Number(b.rewardValue),Math.max(0,Number(b.minContinuousDays||30)),
          b.stockLimit==null?null:Number(b.stockLimit),Math.max(1,Number(b.perUserLimit||1)),String(b.termsRu||''),String(b.termsEn||'')
        ]);
      let order=10;
      for(const req of Array.isArray(b.requirements)?b.requirements:[]){
        let channelId=null;
        if(req.channelId){
          const ch=await this.channelByRef(req.channelId);channelId=ch&&ch.storageId||null;
        }
        await client.query(`INSERT INTO loyalty_offer_requirements(offer_id,requirement_type,channel_id,min_continuous_days,required,sort_order,metadata)
          VALUES($1,$2,$3,$4,$5,$6,$7)`,[r.rows[0].id,String(req.type),channelId,Math.max(0,Number(req.minContinuousDays||0)),req.required!==false,order,req.metadata||{}]);
        order+=10;
      }
      await client.query('COMMIT');
      return this.offerByRef(externalKey);
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }

  async addSocialChannel(brandRef,b){
    if(!this.pool)return null;
    const brand=await this.brandByRef(brandRef);if(!brand)return null;
    const platform=String(b.platform||'').toLowerCase();
    const verificationMode=platform==='telegram'?'membership_event':platform==='vk'?'api_current':'unsupported';
    const externalKey='sc_'+Date.now().toString(36)+'_'+Math.random().toString(16).slice(2,8);
    const r=await this.pool.query(`INSERT INTO brand_social_channels(
      brand_id,owner_type,platform,external_channel_id,handle,url,verification_mode,status,external_key,metadata)
      VALUES($1,'brand',$2,$3,$4,$5,$6,$7,$8,'{}'::jsonb)
      ON CONFLICT(platform,external_channel_id) DO UPDATE SET
        brand_id=EXCLUDED.brand_id,handle=EXCLUDED.handle,url=EXCLUDED.url,verification_mode=EXCLUDED.verification_mode,status=EXCLUDED.status
      RETURNING *`,[brand.storageId,platform,String(b.externalChannelId||''),String(b.handle||''),String(b.url||''),verificationMode,platform==='instagram'?'paused':'active',externalKey]);
    return camelChannel({...r.rows[0],brand_external_key:brand.id,brand_slug:brand.slug});
  }

  async preferences(userId){
    if(!this.pool){
      const key=String(userId);
      if(!this.memory.notificationPreferences.has(key))this.memory.notificationPreferences.set(key,{userId:key,criticalEnabled:true,liveEnabled:true,followedBrandNewsEnabled:true,loyaltyEnabled:true,brandEventsEnabled:true,paidPromotionsEnabled:false,quietHours:{},updatedAt:new Date().toISOString()});
      return this.memory.notificationPreferences.get(key);
    }
    await this.pool.query(`INSERT INTO notification_preferences(user_id) VALUES($1)
      ON CONFLICT(user_id) DO NOTHING`,[userId]);
    const r=await this.pool.query('SELECT * FROM notification_preferences WHERE user_id=$1',[userId]);
    const x=r.rows[0];
    return {userId:String(x.user_id),criticalEnabled:x.critical_enabled,liveEnabled:x.live_enabled,followedBrandNewsEnabled:x.followed_brand_news_enabled,loyaltyEnabled:x.loyalty_enabled,brandEventsEnabled:x.brand_events_enabled,paidPromotionsEnabled:x.paid_promotions_enabled,quietHours:x.quiet_hours||{},updatedAt:x.updated_at};
  }

  async updatePreferences(userId,b){
    if(!this.pool){
      const p=await this.preferences(userId);
      for(const k of ['criticalEnabled','liveEnabled','followedBrandNewsEnabled','loyaltyEnabled','brandEventsEnabled','paidPromotionsEnabled'])if(Object.prototype.hasOwnProperty.call(b,k))p[k]=!!b[k];
      if(b.quietHours&&typeof b.quietHours==='object')p.quietHours=b.quietHours;p.updatedAt=new Date().toISOString();return p;
    }
    const current=await this.preferences(userId);
    const next={...current};
    for(const k of ['criticalEnabled','liveEnabled','followedBrandNewsEnabled','loyaltyEnabled','brandEventsEnabled','paidPromotionsEnabled'])if(Object.prototype.hasOwnProperty.call(b,k))next[k]=!!b[k];
    if(b.quietHours&&typeof b.quietHours==='object')next.quietHours=b.quietHours;
    await this.pool.query(`UPDATE notification_preferences SET
      critical_enabled=$2,live_enabled=$3,followed_brand_news_enabled=$4,loyalty_enabled=$5,brand_events_enabled=$6,paid_promotions_enabled=$7,quiet_hours=$8,updated_at=now()
      WHERE user_id=$1`,[userId,next.criticalEnabled,next.liveEnabled,next.followedBrandNewsEnabled,next.loyaltyEnabled,next.brandEventsEnabled,next.paidPromotionsEnabled,next.quietHours]);
    return this.preferences(userId);
  }

  async recordImpression(userId,postRef,surface){
    if(!this.pool)return false;
    const r=await this.pool.query(`SELECT id FROM brand_content_posts WHERE external_key=$1 OR id::text=$1 LIMIT 1`,[String(postRef)]);
    if(!r.rowCount)return false;
    await this.pool.query(`INSERT INTO content_impressions(user_id,post_id,surface) VALUES($1,$2,$3)`,[/^[0-9a-f-]{36}$/i.test(String(userId))?userId:null,r.rows[0].id,String(surface||'mfw_365')]);
    return true;
  }

  async personalFeed(userId){
    if(!this.pool)return null;
    const followed=await this.brandFollowRefs(userId);
    const postsR=await this.pool.query(`SELECT p.*,b.external_key brand_external_key,b.slug brand_slug,
      COALESCE(i.impressions_7d,0)::int impressions_7d
      FROM brand_content_posts p
      JOIN brands b ON b.id=p.brand_id
      LEFT JOIN LATERAL (
        SELECT count(*) impressions_7d FROM content_impressions ci
        WHERE ci.post_id=p.id AND ci.user_id=$1 AND ci.occurred_at>=now()-interval '7 days'
      ) i ON true
      WHERE p.status='published'
      ORDER BY COALESCE(p.published_at,p.created_at) DESC`,[userId]);
    const now=Date.now();
    const eligible=[];
    for(const row of postsR.rows){
      const post=camelPost(row);
      const audience=post.audienceScope&&post.audienceScope.kind;
      if(audience==='brand_followers'&&!followed.has(String(post.brandId)))continue;
      if(!['all_mfw','brand_followers'].includes(audience))continue;
      const cap=Number(post.frequencyCap&&post.frequencyCap.per_user_per_7d||post.frequencyCap&&post.frequencyCap.perUserPer7d||2);
      if(post.isPaid&&Number(row.impressions_7d)>=cap)continue;
      const ageHours=Math.max(0,(now-new Date(post.publishedAt||post.createdAt||now).getTime())/3600000);
      const freshness=Math.max(0,30-Math.min(30,ageHours/24));
      let score=60,reason='mfw_relevant';
      if(post.kind==='event'&&followed.has(String(post.brandId))&&!post.isPaid){score=108;reason='followed_brand_event';}
      else if(post.kind==='offer'&&followed.has(String(post.brandId))&&!post.isPaid){score=105;reason='followed_brand_offer';}
      else if(followed.has(String(post.brandId))&&!post.isPaid){score=100;reason='followed_brand';}
      else if(post.isPaid){score=35;reason='sponsored';}
      eligible.push({...post,feedScore:Math.round((score+freshness)*100)/100,feedReason:reason});
    }
    eligible.sort((a,b)=>b.feedScore-a.feedScore||String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));
    const result=[];let sincePaid=4;
    for(const post of eligible){if(post.isPaid){if(sincePaid<3)continue;sincePaid=0;}else sincePaid++;result.push(post);}
    return result;
  }


  async cleanupAuthFlows(){
    if(!this.pool){
      if(!this.memory.socialAuthFlows)return {expired:0,deleted:0};
      let expired=0,deleted=0;
      const now=Date.now();
      for(const [state,flow] of this.memory.socialAuthFlows.entries()){
        const expires=new Date(flow.expiresAt||0).getTime();
        if(['pending','processing'].includes(flow.status)&&expires<=now){
          flow.status='expired';flow.codeVerifier='';flow.nonce=null;flow.completedAt=new Date().toISOString();expired++;
        }
        const doneAt=new Date(flow.completedAt||0).getTime();
        if(['completed','failed','expired'].includes(flow.status)&&doneAt&&doneAt<=now-24*60*60*1000){
          this.memory.socialAuthFlows.delete(state);deleted++;
        }
      }
      return {expired,deleted};
    }
    const expired=await this.pool.query(`UPDATE social_auth_flows SET
      status='expired',code_verifier='',nonce=NULL,completed_at=COALESCE(completed_at,now())
      WHERE status IN ('pending','processing') AND expires_at<=now()
      RETURNING id`);
    const deleted=await this.pool.query(`DELETE FROM social_auth_flows
      WHERE status IN ('completed','failed','expired')
        AND COALESCE(completed_at,expires_at,created_at)<now()-interval '24 hours'
      RETURNING id`);
    return {expired:expired.rowCount,deleted:deleted.rowCount};
  }

  async createAuthFlow({userId,platform,state,codeVerifier,nonce,redirectUri,metadata}){
    await this.cleanupAuthFlows();
    if(!this.pool){
      if(!this.memory.socialAuthFlows)this.memory.socialAuthFlows=new Map();
      const item={id:'saf_'+Math.random().toString(16).slice(2),userId:String(userId),platform,state,codeVerifier,nonce:nonce||null,redirectUri,status:'pending',metadata:metadata||{},createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10*60000).toISOString()};
      this.memory.socialAuthFlows.set(state,item);return item;
    }
    const r=await this.pool.query(`INSERT INTO social_auth_flows(user_id,platform,state,code_verifier,nonce,redirect_uri,status,metadata)
      VALUES($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING *`,[userId,platform,state,codeVerifier,nonce||null,redirectUri,metadata||{}]);
    const x=r.rows[0];
    return {id:String(x.id),userId:String(x.user_id),platform:x.platform,state:x.state,codeVerifier:x.code_verifier,nonce:x.nonce,redirectUri:x.redirect_uri,status:x.status,metadata:x.metadata||{},createdAt:x.created_at,expiresAt:x.expires_at};
  }

  async authFlowByState(platform,state){
    if(!this.pool){
      await this.cleanupAuthFlows();
      const x=this.memory.socialAuthFlows&&this.memory.socialAuthFlows.get(String(state));
      if(!x||x.platform!==platform||x.status!=='pending')return null;
      if(Date.now()>=new Date(x.expiresAt).getTime()){
        x.status='expired';x.codeVerifier='';x.nonce=null;x.completedAt=new Date().toISOString();return null;
      }
      x.status='processing';
      return {...x};
    }
    await this.cleanupAuthFlows();
    const r=await this.pool.query(`UPDATE social_auth_flows SET status='processing'
      WHERE platform=$1 AND state=$2 AND status='pending' AND expires_at>now()
      RETURNING *`,[platform,String(state)]);
    if(!r.rowCount)return null;
    const x=r.rows[0];
    return {id:String(x.id),userId:String(x.user_id),platform:x.platform,state:x.state,codeVerifier:x.code_verifier,nonce:x.nonce,redirectUri:x.redirect_uri,status:x.status,metadata:x.metadata||{},createdAt:x.created_at,expiresAt:x.expires_at};
  }

  async finishAuthFlow(flow,status,metadata){
    if(!flow)return;
    if(!['completed','failed','expired'].includes(String(status)))throw new Error('invalid_social_auth_terminal_status');
    if(!this.pool){
      const original=this.memory.socialAuthFlows&&this.memory.socialAuthFlows.get(String(flow.state));
      if(!original)return;
      original.status=status;original.codeVerifier='';original.nonce=null;original.completedAt=new Date().toISOString();original.metadata={...(original.metadata||{}),...(metadata||{})};return;
    }
    await this.pool.query(`UPDATE social_auth_flows SET
      status=$2,metadata=metadata||$3::jsonb,completed_at=now(),code_verifier='',nonce=NULL
      WHERE id=$1 AND status='processing'`,[flow.id,status,JSON.stringify(metadata||{})]);
  }

  async upsertSocialConnection(userId,platform,externalUserId,externalHandle,scopes,metadata){
    if(!this.pool){
      const key=String(userId)+':'+String(platform);
      const item={id:'soc_'+Math.random().toString(16).slice(2),userId:String(userId),platform,externalUserId:String(externalUserId),externalHandle:String(externalHandle||''),status:'active',scopes:scopes||[],connectedAt:new Date().toISOString(),lastSyncedAt:new Date().toISOString(),metadata:metadata||{}};
      this.memory.socialConnections.set(key,item);return item;
    }
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      await client.query(`UPDATE social_connections SET status='revoked',last_synced_at=now()
        WHERE user_id=$1 AND platform=$2 AND status='active' AND external_user_id<>$3`,[userId,platform,String(externalUserId)]);
      const r=await client.query(`INSERT INTO social_connections(user_id,platform,external_user_id,external_handle,status,scopes,last_synced_at)
        VALUES($1,$2,$3,$4,'active',$5,now())
        ON CONFLICT(user_id,platform,external_user_id)
        DO UPDATE SET external_handle=EXCLUDED.external_handle,status='active',scopes=EXCLUDED.scopes,last_synced_at=now()
        RETURNING *`,[userId,platform,String(externalUserId),String(externalHandle||''),scopes||[]]);
      await client.query('COMMIT');
      const x=r.rows[0];
      return {id:String(x.id),userId:String(x.user_id),platform:x.platform,externalUserId:x.external_user_id,externalHandle:x.external_handle,status:x.status,scopes:x.scopes||[],connectedAt:x.connected_at,lastSyncedAt:x.last_synced_at,metadata:metadata||{}};
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }

  async followerCount(brandRef){
    if(!this.pool){
      return [...this.memory.brandFollows.values()].reduce((n,set)=>n+(set.has(String(brandRef))?1:0),0);
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return 0;
    const r=await this.pool.query('SELECT count(*)::int n FROM brand_follows WHERE brand_id=$1',[brand.storageId]);
    return Number(r.rows[0].n||0);
  }

  async brandAudience(brandRef){
    const bucket=function(days){
      if(days<7)return 'new_0_6';
      if(days<30)return 'growing_7_29';
      if(days<60)return 'eligible_30_59';
      return 'loyal_60_plus';
    };
    if(!this.pool){
      const now=Date.now(),rows=[];
      for(const [userId,set] of this.memory.brandFollows.entries()){
        if(!set.has(String(brandRef)))continue;
        const key=String(userId)+':'+String(brandRef);
        const started=this.memory.brandFollowStartedAt&&this.memory.brandFollowStartedAt.get(key);
        const days=started?Math.max(0,Math.floor((now-new Date(started).getTime())/86400000)):0;
        rows.push({userId:String(userId),followDays:days,bucket:bucket(days),verifiedSocialDays:null});
      }
      const buckets={new_0_6:0,growing_7_29:0,eligible_30_59:0,loyal_60_plus:0};
      rows.forEach(x=>{buckets[x.bucket]++;});
      const avg=rows.length?Math.round(rows.reduce((s,x)=>s+x.followDays,0)/rows.length*10)/10:0;
      return {total:rows.length,averageFollowDays:avg,buckets,verifiedSocial:{active:0,days30Plus:0},members:rows,dataMode:'memory'};
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return {total:0,averageFollowDays:0,buckets:{new_0_6:0,growing_7_29:0,eligible_30_59:0,loyal_60_plus:0},verifiedSocial:{active:0,days30Plus:0},members:[],dataMode:'postgres'};
    const follows=await this.pool.query(`SELECT f.user_id,f.created_at,
      GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (now()-f.created_at))/86400))::int follow_days
      FROM brand_follows f WHERE f.brand_id=$1 ORDER BY f.created_at`,[brand.storageId]);
    const social=await this.pool.query(`SELECT sm.user_id,
      MAX(CASE WHEN sm.status='active' THEN 1 ELSE 0 END)::int active,
      MAX(CASE WHEN sm.status='active' AND sm.continuous_since IS NOT NULL
        THEN GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (now()-sm.continuous_since))/86400)) ELSE 0 END)::int verified_days
      FROM social_memberships sm
      JOIN brand_social_channels ch ON ch.id=sm.channel_id
      WHERE ch.brand_id=$1
      GROUP BY sm.user_id`,[brand.storageId]);
    const sm=new Map(social.rows.map(x=>[String(x.user_id),{active:Number(x.active||0)>0,verifiedDays:Number(x.verified_days||0)}]));
    const buckets={new_0_6:0,growing_7_29:0,eligible_30_59:0,loyal_60_plus:0};
    const members=follows.rows.map(x=>{
      const days=Number(x.follow_days||0),v=sm.get(String(x.user_id))||{active:false,verifiedDays:0};
      const b=bucket(days);buckets[b]++;
      return {userId:String(x.user_id),followDays:days,bucket:b,verifiedSocialActive:v.active,verifiedSocialDays:v.verifiedDays};
    });
    const avg=members.length?Math.round(members.reduce((s,x)=>s+x.followDays,0)/members.length*10)/10:0;
    return {
      total:members.length,averageFollowDays:avg,buckets,
      verifiedSocial:{active:members.filter(x=>x.verifiedSocialActive).length,days30Plus:members.filter(x=>x.verifiedSocialDays>=30).length},
      members:members.slice(0,200),dataMode:'postgres'
    };
  }

  async setBrandFavorite(userId,brandRef,favorite){
    if(!this.pool){
      if(!this.memory.brandFavorites)this.memory.brandFavorites=new Map();
      const set=this.memory.brandFavorites.get(String(userId))||new Set();
      if(favorite)set.add(String(brandRef));else set.delete(String(brandRef));
      this.memory.brandFavorites.set(String(userId),set);return !!favorite;
    }
    const brand=await this.brandByRef(brandRef);if(!brand)throw new Error('brand_not_found');
    if(favorite)await this.pool.query('INSERT INTO brand_favorites(user_id,brand_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[userId,brand.storageId]);
    else await this.pool.query('DELETE FROM brand_favorites WHERE user_id=$1 AND brand_id=$2',[userId,brand.storageId]);
    return !!favorite;
  }

  async brandCrmAudience(brandRef){
    const base=await this.brandAudience(brandRef);
    if(!this.pool){
      const fav=this.memory.brandFavorites||new Map(),buyers=this.memory.shortlists||new Map();
      const members=base.members.map(x=>({...x,favorite:[...fav.entries()].some(([u,s])=>String(u)===x.userId&&s.has(String(brandRef))),buyer:[...buyers.entries()].some(([u,s])=>String(u)===x.userId&&s.has(String(brandRef)))}));
      return {...base,members,segments:{all:members.length,days30Plus:members.filter(x=>x.followDays>=30).length,days60Plus:members.filter(x=>x.followDays>=60).length,favorite:members.filter(x=>x.favorite).length,buyer:members.filter(x=>x.buyer).length}};
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return {...base,segments:{all:0,days30Plus:0,days60Plus:0,favorite:0,buyer:0}};
    const fav=await this.pool.query('SELECT user_id FROM brand_favorites WHERE brand_id=$1',[brand.storageId]);
    const favs=new Set(fav.rows.map(x=>String(x.user_id)));
    const buyers=new Set();
    try{
      const q=await this.pool.query(`SELECT DISTINCT buyer_id::text user_id FROM commerce_leads WHERE brand_id=$1 AND stage IN ('shortlisted','qualified','meeting','follow_up','ordered')`,[brand.storageId]);
      q.rows.forEach(x=>buyers.add(String(x.user_id)));
    }catch(_){}
    const members=base.members.map(x=>({...x,favorite:favs.has(x.userId),buyer:buyers.has(x.userId)}));
    return {...base,members,segments:{all:members.length,days30Plus:members.filter(x=>x.followDays>=30).length,days60Plus:members.filter(x=>x.followDays>=60).length,favorite:members.filter(x=>x.favorite).length,buyer:members.filter(x=>x.buyer).length}};
  }

  async saveBrandSegment(brandRef,input,createdBy){
    const definition=input.definition||{op:'and',rules:[]};
    if(!this.pool){
      if(!this.memory.brandSavedSegments)this.memory.brandSavedSegments=new Map();
      const id='seg_'+require('crypto').randomBytes(6).toString('hex'),item={id,brandId:String(brandRef),name:String(input.name||'Segment'),definition,status:'active',createdBy:String(createdBy||''),createdAt:new Date().toISOString(),demo:true};
      this.memory.brandSavedSegments.set(id,item);return item;
    }
    const brand=await this.brandByRef(brandRef);if(!brand)throw new Error('brand_not_found');
    const r=await this.pool.query(`INSERT INTO brand_saved_segments(brand_id,external_key,name,definition,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,[brand.storageId,'seg_'+require('crypto').randomBytes(8).toString('hex'),String(input.name||'Segment'),definition,createdBy||null]);
    return r.rows[0];
  }

  async savedSegments(brandRef){
    if(!this.pool)return [...(this.memory.brandSavedSegments||new Map()).values()].filter(x=>x.brandId===String(brandRef)&&x.status==='active');
    const brand=await this.brandByRef(brandRef);if(!brand)return [];
    const r=await this.pool.query('SELECT * FROM brand_saved_segments WHERE brand_id=$1 AND status=\'active\' ORDER BY created_at DESC',[brand.storageId]);return r.rows;
  }

  async resolveSegmentAudience(brandRef,definition){
    const audience=await this.brandCrmAudience(brandRef),rules=Array.isArray(definition&&definition.rules)?definition.rules:[],op=String(definition&&definition.op||'and').toLowerCase();
    function pass(member,rule){
      if(rule.field==='followDays')return Number(member.followDays||0)>=Number(rule.gte||0);
      if(rule.field==='verifiedSocialDays')return Number(member.verifiedSocialDays||0)>=Number(rule.gte||0);
      if(rule.field==='favorite')return !!member.favorite===!!rule.eq;
      if(rule.field==='buyer')return !!member.buyer===!!rule.eq;
      return false;
    }
    const members=audience.members.filter(m=>!rules.length||op==='or'?rules.some(r=>pass(m,r)):rules.every(r=>pass(m,r)));
    return {definition:{op,rules},count:members.length,members};
  }

  async queueCampaign(brandRef,campaignRef){
    if(!this.pool){
      const campaign=(this.memory.brandCampaigns||new Map()).get(String(campaignRef));if(!campaign)throw new Error('campaign_not_found');
      const definition=campaign.segment&&campaign.segment.rules?campaign.segment:{op:'and',rules:campaign.segment&&campaign.segment.kind==='days60Plus'?[{field:'followDays',gte:60}]:campaign.segment&&campaign.segment.kind==='days30Plus'?[{field:'followDays',gte:30}]:campaign.segment&&campaign.segment.kind==='favorite'?[{field:'favorite',eq:true}]:campaign.segment&&campaign.segment.kind==='buyer'?[{field:'buyer',eq:true}]:[]};
      const resolved=await this.resolveSegmentAudience(brandRef,definition);campaign.status='scheduled';campaign.audienceCount=resolved.count;return {campaign,queued:resolved.count,suppressed:0,dataMode:'memory'};
    }
    const brand=await this.brandByRef(brandRef);if(!brand)throw new Error('brand_not_found');
    const cr=await this.pool.query('SELECT * FROM brand_campaigns WHERE brand_id=$1 AND (external_key=$2 OR id::text=$2) LIMIT 1',[brand.storageId,String(campaignRef)]);
    if(!cr.rowCount)throw new Error('campaign_not_found');
    const campaign=cr.rows[0];
    let definition=campaign.segment||{op:'and',rules:[]};
    if(campaign.saved_segment_id){const sr=await this.pool.query('SELECT definition FROM brand_saved_segments WHERE id=$1',[campaign.saved_segment_id]);if(sr.rowCount)definition=sr.rows[0].definition;}
    if(definition.kind&&!definition.rules){
      definition={op:'and',rules:definition.kind==='days60Plus'?[{field:'followDays',gte:60}]:definition.kind==='days30Plus'?[{field:'followDays',gte:30}]:definition.kind==='favorite'?[{field:'favorite',eq:true}]:definition.kind==='buyer'?[{field:'buyer',eq:true}]:[]};
    }
    const resolved=await this.resolveSegmentAudience(brandRef,definition),client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      let queued=0,suppressed=0;
      for(const m of resolved.members){
        const uid=String(m.userId);
        const pref=await client.query('SELECT paid_promotions_enabled,quiet_hours FROM notification_preferences WHERE user_id=$1',[uid]);
        const consent=!campaign.require_marketing_consent||(pref.rowCount&&pref.rows[0].paid_promotions_enabled);
        const cap=Number(campaign.frequency_cap&&campaign.frequency_cap.per_user_per_7d||2);
        const recent=await client.query(`SELECT count(*)::int n FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE d.user_id=$1 AND n.category='brand_campaign' AND d.status IN ('queued','sent','delivered','opened') AND n.created_at>=now()-interval '7 days'`,[uid]);
        const allowed=consent&&Number(recent.rows[0].n||0)<cap;
        const controlPct=Math.max(0,Math.min(50,Number(campaign.control_pct||0))),hash=require('crypto').createHash('sha256').update(String(campaign.id)+':'+uid).digest(),bucket=hash.readUInt32BE(0)%10000,experimentGroup=bucket<Math.round(controlPct*100)?'control':'treatment';
        await client.query('INSERT INTO brand_campaign_audience(campaign_id,user_id,segment_reason,experiment_group) VALUES($1,$2,$3,$4) ON CONFLICT(campaign_id,user_id) DO UPDATE SET segment_reason=excluded.segment_reason,experiment_group=excluded.experiment_group',[campaign.id,uid,{definition},experimentGroup]);
        if(experimentGroup==='control')continue;
        if(!allowed){suppressed++;continue;}
        const n=await client.query(`INSERT INTO notifications(audience,category,title,body,payload,status,scheduled_at) VALUES($1,'brand_campaign',$2,$3,$4,'scheduled',COALESCE($5,now())) RETURNING id`,[{kind:'user',userId:uid},campaign.name,campaign.message_ru,{brandId:brand.id,campaignId:String(campaign.id)},campaign.scheduled_at]);
        await client.query(`INSERT INTO notification_deliveries(notification_id,user_id,channel,status,metadata) VALUES($1,$2,$3,'queued',$4)`,[n.rows[0].id,uid,campaign.channel,{campaignId:String(campaign.id)}]);
        await client.query(`INSERT INTO brand_campaign_events(campaign_id,user_id,event_type,metadata) VALUES($1,$2,'queued',$3)`,[campaign.id,uid,{channel:campaign.channel}]);queued++;
      }
      await client.query(`UPDATE brand_campaigns SET status='scheduled',updated_at=now() WHERE id=$1`,[campaign.id]);
      const ctrl=await client.query("SELECT count(*)::int n FROM brand_campaign_audience WHERE campaign_id=$1 AND experiment_group='control'",[campaign.id]);
      await client.query('COMMIT');return {campaign:{id:String(campaign.id),name:campaign.name,status:'scheduled'},audience:resolved.count,queued,suppressed,control:Number(ctrl.rows[0].n||0),dataMode:'postgres'};
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }

  async refreshCustomerLifecycle(brandRef){
    const now=Date.now();
    if(!this.pool){
      const rows=(this.memory.brandPurchases||[]).filter(x=>x.brandId===String(brandRef)),by=new Map();
      rows.forEach(x=>{if(!x.userId)return;const a=by.get(String(x.userId))||[];a.push(x);by.set(String(x.userId),a)});
      return [...by.entries()].map(([userId,a])=>{a.sort((x,y)=>new Date(x.purchasedAt)-new Date(y.purchasedAt));const recency=Math.floor((now-new Date(a[a.length-1].purchasedAt).getTime())/86400000),frequency=a.length,monetary=a.reduce((s,x)=>s+Number(x.amount||0),0);return {userId,recencyDays:recency,frequency365d:frequency,monetary365d:monetary,lifecycle:frequency>=4&&recency<=60?'loyal':recency<=90?'active':recency<=180?'at_risk':'churned'}});
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return [];
    await this.pool.query(`WITH p AS (
      SELECT user_id,min(purchased_at) first_purchase,max(purchased_at) last_purchase,
        count(*) FILTER (WHERE purchased_at>=now()-interval '365 days')::int frequency_365d,
        COALESCE(sum(amount) FILTER (WHERE purchased_at>=now()-interval '365 days'),0) monetary_365d
      FROM brand_purchases WHERE brand_id=$1 AND user_id IS NOT NULL GROUP BY user_id
    ), scored AS (
      SELECT *,GREATEST(1,LEAST(5,6-ntile(5) OVER(ORDER BY last_purchase DESC))) r_score,
        ntile(5) OVER(ORDER BY frequency_365d) f_score,ntile(5) OVER(ORDER BY monetary_365d) m_score
      FROM p
    ) INSERT INTO brand_customer_profiles(brand_id,user_id,recency_days,frequency_365d,monetary_365d,r_score,f_score,m_score,lifecycle,last_purchase_at,first_purchase_at,updated_at)
      SELECT $1,user_id,EXTRACT(day FROM now()-last_purchase)::int,frequency_365d,monetary_365d,r_score,f_score,m_score,
        CASE WHEN frequency_365d>=4 AND last_purchase>=now()-interval '60 days' THEN 'loyal'
             WHEN last_purchase>=now()-interval '90 days' THEN 'active'
             WHEN last_purchase>=now()-interval '180 days' THEN 'at_risk' ELSE 'churned' END,last_purchase,first_purchase,now()
      FROM scored ON CONFLICT(brand_id,user_id) DO UPDATE SET recency_days=excluded.recency_days,frequency_365d=excluded.frequency_365d,monetary_365d=excluded.monetary_365d,r_score=excluded.r_score,f_score=excluded.f_score,m_score=excluded.m_score,lifecycle=excluded.lifecycle,last_purchase_at=excluded.last_purchase_at,updated_at=now()`,[brand.storageId]);
    const r=await this.pool.query('SELECT lifecycle,count(*)::int customers,avg(recency_days)::numeric(10,1) avg_recency,avg(frequency_365d)::numeric(10,1) avg_frequency,avg(monetary_365d)::numeric(14,2) avg_monetary FROM brand_customer_profiles WHERE brand_id=$1 GROUP BY lifecycle ORDER BY customers DESC',[brand.storageId]);return r.rows;
  }

  async campaignIncrementality(brandRef){
    if(!this.pool)return {campaigns:[],dataMode:'memory'};
    const brand=await this.brandByRef(brandRef);if(!brand)return {campaigns:[],dataMode:'postgres'};
    const r=await this.pool.query(`WITH perf AS (
      SELECT c.id,c.external_key,c.name,c.cost_amount,c.cost_currency,a.experiment_group,
        count(DISTINCT a.user_id)::int audience,
        count(DISTINCT p.user_id)::int buyers,COALESCE(sum(p.amount),0) revenue
      FROM brand_campaigns c JOIN brand_campaign_audience a ON a.campaign_id=c.id
      LEFT JOIN brand_purchases p ON p.brand_id=c.brand_id AND p.user_id=a.user_id AND p.purchased_at>=COALESCE(c.sent_at,c.scheduled_at,c.created_at) AND p.purchased_at<COALESCE(c.sent_at,c.scheduled_at,c.created_at)+interval '30 days'
      WHERE c.brand_id=$1 GROUP BY c.id,a.experiment_group
    ) SELECT * FROM perf ORDER BY id,experiment_group`,[brand.storageId]);
    const grouped={};for(const x of r.rows){const k=String(x.external_key||x.id);if(!grouped[k])grouped[k]={id:k,name:x.name,cost:Number(x.cost_amount||0),currency:x.cost_currency,treatment:null,control:null};grouped[k][x.experiment_group]={audience:Number(x.audience||0),buyers:Number(x.buyers||0),revenue:Number(x.revenue||0)};}
    const campaigns=Object.values(grouped).map(x=>{const t=x.treatment||{audience:0,buyers:0,revenue:0},k=x.control||{audience:0,buyers:0,revenue:0},tr=t.audience?t.buyers/t.audience:0,cr=k.audience?k.buyers/k.audience:0,incrementalBuyers=Math.max(0,t.buyers-(cr*t.audience)),incrementalRevenue=Math.max(0,t.revenue-(k.audience?k.revenue/k.audience*t.audience:0));return {...x,treatment:t,control:k,treatmentConversion:tr,controlConversion:cr,lift:cr?(tr-cr)/cr:null,incrementalBuyers,incrementalRevenue,roi:x.cost?(incrementalRevenue-x.cost)/x.cost:null,cac:incrementalBuyers?x.cost/incrementalBuyers:null};});
    return {campaigns,dataMode:'postgres'};
  }

  async createJourney(brandRef,input,createdBy){
    if(!this.pool){if(!this.memory.brandJourneys)this.memory.brandJourneys=new Map();const id='journey_'+require('crypto').randomBytes(6).toString('hex'),x={id,brandId:String(brandRef),name:String(input.name||'Journey'),trigger:input.trigger||{},steps:input.steps||[],status:input.status||'draft',createdAt:new Date().toISOString(),demo:true};this.memory.brandJourneys.set(id,x);return x;}
    const brand=await this.brandByRef(brandRef);const r=await this.pool.query(`INSERT INTO brand_journeys(brand_id,external_key,name,trigger,steps,status,frequency_cap,created_by,holdout_pct,stop_conditions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[brand.storageId,'journey_'+require('crypto').randomBytes(8).toString('hex'),String(input.name||'Journey'),input.trigger||{},input.steps||[],String(input.status||'draft'),input.frequencyCap||{per_user_per_30d:3},createdBy||null,Math.max(0,Math.min(50,Number(input.holdoutPct==null?10:input.holdoutPct))),input.stopConditions||{on_purchase:true}]);return r.rows[0];
  }

  async journeys(brandRef){
    if(!this.pool)return [...(this.memory.brandJourneys||new Map()).values()].filter(x=>x.brandId===String(brandRef));
    const brand=await this.brandByRef(brandRef);if(!brand)return [];const r=await this.pool.query('SELECT * FROM brand_journeys WHERE brand_id=$1 ORDER BY created_at DESC',[brand.storageId]);return r.rows;
  }

  async runJourneys(brandRef){
    const journeys=(await this.journeys(brandRef)).filter(j=>j.status==='active');
    if(!this.pool)return {journeys:journeys.length,enrolled:0,queued:0,dataMode:'memory'};
    const brand=await this.brandByRef(brandRef);await this.refreshCustomerLifecycle(brandRef);
    let enrolled=0,queued=0,suppressed=0;
    for(const j of journeys){
      const trigger=j.trigger||{},lifecycle=String(trigger.lifecycle||'at_risk');
      const candidates=await this.pool.query('SELECT user_id,lifecycle FROM brand_customer_profiles WHERE brand_id=$1 AND lifecycle=$2',[brand.storageId,lifecycle]);
      for(const row of candidates.rows){
        const uid=String(row.user_id);
        const already=await this.pool.query("SELECT 1 FROM brand_journey_enrollments WHERE journey_id=$1 AND user_id=$2 AND state='active'",[j.id,uid]);if(already.rowCount)continue;
        const pref=await this.pool.query('SELECT paid_promotions_enabled FROM notification_preferences WHERE user_id=$1',[uid]);if(!pref.rowCount||!pref.rows[0].paid_promotions_enabled){suppressed++;continue;}
        const cap=Number(j.frequency_cap&&j.frequency_cap.per_user_per_30d||3);
        const recent=await this.pool.query("SELECT count(*)::int n FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE d.user_id=$1 AND n.payload->>'journeyId'=$2 AND n.created_at>=now()-interval '30 days'",[uid,String(j.id)]);if(Number(recent.rows[0].n||0)>=cap){suppressed++;continue;}
        const steps=Array.isArray(j.steps)?j.steps:[],first=steps[0]||{type:'push',title:j.name,body:''};
        const holdoutPct=Math.max(0,Math.min(50,Number(j.holdout_pct||0))),h=require('crypto').createHash('sha256').update(String(j.id)+':'+uid).digest(),experimentGroup=(h.readUInt32BE(0)%10000)<Math.round(holdoutPct*100)?'holdout':'treatment';
        await this.pool.query('INSERT INTO brand_journey_enrollments(journey_id,user_id,state,current_step,last_action_at,metadata,experiment_group,next_run_at) VALUES($1,$2,\'active\',0,now(),$3,$4,now()) ON CONFLICT DO NOTHING',[j.id,uid,{triggerLifecycle:lifecycle},experimentGroup]);enrolled++;
        if(experimentGroup==='holdout')continue;
        if(first.type==='push'){
          const n=await this.pool.query(`INSERT INTO notifications(audience,category,title,body,payload,status,scheduled_at) VALUES($1,'brand_campaign',$2,$3,$4,'scheduled',now()) RETURNING id`,[{kind:'user',userId:uid},String(first.title||j.name),String(first.body||''),{brandId:brand.id,journeyId:String(j.id),step:0}]);
          await this.pool.query("INSERT INTO notification_deliveries(notification_id,user_id,channel,status,metadata) VALUES($1,$2,'push','queued',$3)",[n.rows[0].id,uid,{journeyId:String(j.id),step:0}]);queued++;
        }
      }
    }
    return {journeys:journeys.length,enrolled,queued,suppressed,dataMode:'postgres'};
  }

  async scoreCustomerPredictions(brandRef){
    if(!this.pool)return {updated:0,customers:[],dataMode:'memory'};
    const brand=await this.brandByRef(brandRef);if(!brand)return {updated:0,customers:[],dataMode:'postgres'};
    await this.refreshCustomerLifecycle(brandRef);
    await this.pool.query(`UPDATE brand_customer_profiles SET
      churn_score=LEAST(0.99999,GREATEST(0,
        (COALESCE(recency_days,365)::numeric/365)*0.55 +
        (CASE WHEN frequency_365d<=1 THEN 0.25 WHEN frequency_365d=2 THEN 0.15 ELSE 0.05 END) +
        (CASE lifecycle WHEN 'churned' THEN 0.20 WHEN 'at_risk' THEN 0.12 ELSE 0 END))),
      predicted_clv=ROUND((CASE WHEN frequency_365d>0 THEN monetary_365d/frequency_365d ELSE 0 END) *
        GREATEST(1,LEAST(12,frequency_365d*1.5)) *
        (1-LEAST(0.85,GREATEST(0,(COALESCE(recency_days,365)::numeric/365)*0.6))),2),
      next_best_action=CASE
        WHEN lifecycle='churned' THEN 'reactivate_with_offer'
        WHEN lifecycle='at_risk' THEN 'personal_reactivation'
        WHEN lifecycle='loyal' THEN 'vip_early_access'
        WHEN lifecycle='active' AND frequency_365d>=2 THEN 'cross_sell'
        WHEN lifecycle='active' THEN 'second_purchase'
        ELSE 'nurture'
      END,
      updated_at=now()
      WHERE brand_id=$1`,[brand.storageId]);
    const r=await this.pool.query(`SELECT user_id,lifecycle,churn_score,predicted_clv,next_best_action,recency_days,frequency_365d,monetary_365d
      FROM brand_customer_profiles WHERE brand_id=$1 ORDER BY churn_score DESC NULLS LAST,predicted_clv DESC LIMIT 200`,[brand.storageId]);
    return {updated:r.rowCount,customers:r.rows,dataMode:'postgres'};
  }

  async acquisitionEconomics(brandRef){
    if(!this.pool)return {sources:[],dataMode:'memory'};
    const brand=await this.brandByRef(brandRef);if(!brand)return {sources:[],dataMode:'postgres'};
    const r=await this.pool.query(`WITH src AS (
      SELECT a.source,count(DISTINCT a.user_id)::int acquired,COALESCE(sum(a.cost_amount),0) cost,
        count(DISTINCT p.user_id)::int buyers,COALESCE(sum(p.amount),0) revenue
      FROM brand_acquisition_events a
      LEFT JOIN brand_purchases p ON p.brand_id=a.brand_id AND p.user_id=a.user_id AND p.purchased_at>=a.acquired_at
      WHERE a.brand_id=$1 GROUP BY a.source
    ) SELECT source,acquired,cost,buyers,revenue,
      CASE WHEN acquired>0 THEN cost/acquired ELSE NULL END cac,
      CASE WHEN cost>0 THEN (revenue-cost)/cost ELSE NULL END roi,
      CASE WHEN buyers>0 THEN revenue/buyers ELSE NULL END revenue_per_buyer
      FROM src ORDER BY revenue DESC`,[brand.storageId]);
    return {sources:r.rows,dataMode:'postgres'};
  }

  async advanceJourneyStateMachine(brandRef){
    if(!this.pool)return {processed:0,queued:0,completed:0,stoppedOnPurchase:0,branched:0,dataMode:'memory'};
    const brand=await this.brandByRef(brandRef);if(!brand)return {processed:0,queued:0,completed:0,stoppedOnPurchase:0,branched:0,dataMode:'postgres'};
    const rows=await this.pool.query(`SELECT e.*,j.name,j.steps,j.stop_conditions,j.holdout_pct
      FROM brand_journey_enrollments e JOIN brand_journeys j ON j.id=e.journey_id
      WHERE j.brand_id=$1 AND j.status='active' AND e.state='active'
        AND (e.next_run_at IS NULL OR e.next_run_at<=now())
      ORDER BY COALESCE(e.next_run_at,e.enrolled_at) LIMIT 500`,[brand.storageId]);
    let processed=0,queued=0,completed=0,stoppedOnPurchase=0,branched=0;
    for(const e of rows.rows){
      processed++;
      const steps=Array.isArray(e.steps)?e.steps:[],idx=Number(e.current_step||0),step=steps[idx];
      const stop=e.stop_conditions||{};
      if(stop.on_purchase){
        const buy=await this.pool.query('SELECT 1 FROM brand_purchases WHERE brand_id=$1 AND user_id=$2 AND purchased_at>=COALESCE($3,enrolled_at) LIMIT 1',[brand.storageId,e.user_id,e.enrolled_at]);
        if(buy.rowCount){await this.pool.query("UPDATE brand_journey_enrollments SET state='completed',completed_at=now(),metadata=metadata||$3 WHERE journey_id=$1 AND user_id=$2",[e.journey_id,e.user_id,{stopReason:'purchase'}]);stoppedOnPurchase++;completed++;continue;}
      }
      if(e.experiment_group==='holdout'){await this.pool.query("UPDATE brand_journey_enrollments SET state='completed',completed_at=now(),metadata=metadata||$3 WHERE journey_id=$1 AND user_id=$2",[e.journey_id,e.user_id,{holdout:true}]);completed++;continue;}
      if(!step){await this.pool.query("UPDATE brand_journey_enrollments SET state='completed',completed_at=now() WHERE journey_id=$1 AND user_id=$2",[e.journey_id,e.user_id]);completed++;continue;}
      if(step.type==='wait'){
        const days=Number(step.days||0),hours=Number(step.hours||0);
        await this.pool.query("UPDATE brand_journey_enrollments SET current_step=current_step+1,next_run_at=now()+($3::text||' hours')::interval,last_action_at=now() WHERE journey_id=$1 AND user_id=$2",[e.journey_id,e.user_id,String(days*24+hours)]);
        continue;
      }
      if(step.type==='branch'){
        const prof=await this.pool.query('SELECT lifecycle,churn_score,frequency_365d,monetary_365d FROM brand_customer_profiles WHERE brand_id=$1 AND user_id=$2',[brand.storageId,e.user_id]);
        const p=prof.rows[0]||{},field=String(step.field||'lifecycle'),value=p[field],eq=step.eq,next=value===eq?Number(step.thenStep||idx+1):Number(step.elseStep||idx+1);
        await this.pool.query('UPDATE brand_journey_enrollments SET current_step=$3,branch_state=branch_state||$4,last_action_at=now(),next_run_at=now() WHERE journey_id=$1 AND user_id=$2',[e.journey_id,e.user_id,next,{field,value,matched:value===eq}]);branched++;continue;
      }
      if(step.type==='push'){
        const n=await this.pool.query(`INSERT INTO notifications(audience,category,title,body,payload,status,scheduled_at) VALUES($1,'brand_campaign',$2,$3,$4,'scheduled',now()) RETURNING id`,[{kind:'user',userId:String(e.user_id)},String(step.title||e.name),String(step.body||''),{brandId:brand.id,journeyId:String(e.journey_id),step:idx}]);
        await this.pool.query("INSERT INTO notification_deliveries(notification_id,user_id,channel,status,metadata) VALUES($1,$2,'push','queued',$3)",[n.rows[0].id,e.user_id,{journeyId:String(e.journey_id),step:idx}]);queued++;
      }
      await this.pool.query('UPDATE brand_journey_enrollments SET current_step=current_step+1,last_action_at=now(),next_run_at=now() WHERE journey_id=$1 AND user_id=$2',[e.journey_id,e.user_id]);
    }
    return {processed,queued,completed,stoppedOnPurchase,branched,dataMode:'postgres'};
  }

  async audienceAssetSummary(){
    if(!this.pool)return {brands:0,identifiedCustomers:0,retainedCustomers:0,incrementalGmv:0,predictedClv:0,attributableValue:0,dataMode:'memory'};
    const q=await this.pool.query(`WITH brands_active AS (
      SELECT count(*)::int brands FROM brands
    ), identified AS (
      SELECT count(DISTINCT user_id)::int users FROM brand_customer_profiles
    ), retained AS (
      SELECT count(DISTINCT user_id)::int users FROM brand_customer_profiles WHERE lifecycle IN ('active','loyal','reactivated')
    ), clv AS (
      SELECT COALESCE(sum(predicted_clv),0) v FROM brand_customer_profiles
    ), gm AS (
      SELECT COALESCE(sum(p.amount),0) v FROM brand_purchases p
    )
    SELECT (SELECT brands FROM brands_active) brands,(SELECT users FROM identified) identified_customers,
      (SELECT users FROM retained) retained_customers,(SELECT v FROM gm) attributable_gmv,(SELECT v FROM clv) predicted_clv`);
    const x=q.rows[0];return {brands:Number(x.brands||0),identifiedCustomers:Number(x.identified_customers||0),retainedCustomers:Number(x.retained_customers||0),attributableGmv:Number(x.attributable_gmv||0),predictedClv:Number(x.predicted_clv||0),attributableValue:Number(x.attributable_gmv||0)+Number(x.predicted_clv||0),dataMode:'postgres'};
  }

  async ownerControlTower(options={}){
    if(!this.pool)return {summary:{},brands:[],cohorts:[],migration:[],crossEvent:{},acquisitionMix:[],scenarios:[],dataMode:'memory'};
    const retentionRate=Number(options.retentionRate==null?0.30:options.retentionRate);
    const clvRealization=Number(options.clvRealization==null?0.50:options.clvRealization);

    const brandsQ=await this.pool.query(`WITH base AS (
      SELECT b.id,b.external_key,b.name,
        count(DISTINCT p.user_id)::int customers,
        count(p.id)::int orders,
        COALESCE(sum(p.amount),0) attributable_gmv,
        COALESCE(avg(p.amount),0) aov,
        count(DISTINCT cp.user_id) FILTER (WHERE cp.lifecycle IN ('active','loyal','reactivated'))::int retained_customers,
        COALESCE(sum(cp.predicted_clv),0) predicted_clv
      FROM brands b
      LEFT JOIN brand_purchases p ON p.brand_id=b.id
      LEFT JOIN brand_customer_profiles cp ON cp.brand_id=b.id
      GROUP BY b.id
    ), campaign_perf AS (
      SELECT c.brand_id,c.id,c.cost_amount,a.experiment_group,
        count(DISTINCT a.user_id)::numeric audience,
        count(DISTINCT p.user_id)::numeric buyers,
        COALESCE(sum(p.amount),0)::numeric revenue
      FROM brand_campaigns c
      JOIN brand_campaign_audience a ON a.campaign_id=c.id
      LEFT JOIN brand_purchases p ON p.brand_id=c.brand_id AND p.user_id=a.user_id
        AND p.purchased_at>=COALESCE(c.sent_at,c.scheduled_at,c.created_at)
        AND p.purchased_at<COALESCE(c.sent_at,c.scheduled_at,c.created_at)+interval '30 days'
      GROUP BY c.brand_id,c.id,c.cost_amount,a.experiment_group
    ), inc AS (
      SELECT brand_id,
        sum(GREATEST(0,
          COALESCE(max(revenue) FILTER (WHERE experiment_group='treatment'),0) -
          CASE WHEN COALESCE(max(audience) FILTER (WHERE experiment_group='control'),0)>0
            THEN COALESCE(max(revenue) FILTER (WHERE experiment_group='control'),0) /
                 max(audience) FILTER (WHERE experiment_group='control') *
                 COALESCE(max(audience) FILTER (WHERE experiment_group='treatment'),0)
            ELSE 0 END
        )) incremental_gmv,
        sum(DISTINCT cost_amount) campaign_cost
      FROM campaign_perf GROUP BY brand_id
    )
    SELECT base.*,COALESCE(inc.incremental_gmv,0) incremental_gmv,COALESCE(inc.campaign_cost,0) campaign_cost
    FROM base LEFT JOIN inc ON inc.brand_id=base.id
    ORDER BY base.attributable_gmv DESC,base.customers DESC`);

    const cohortQ=await this.pool.query(`WITH firsts AS (
      SELECT user_id,min(purchased_at) first_purchase FROM brand_purchases WHERE user_id IS NOT NULL GROUP BY user_id
    ), cohorts AS (
      SELECT user_id,date_trunc('month',first_purchase) cohort FROM firsts
    )
    SELECT to_char(c.cohort,'YYYY-MM') cohort,count(DISTINCT c.user_id)::int customers,
      count(DISTINCT p.user_id) FILTER (WHERE p.purchased_at>=c.cohort+interval '1 month')::int retained_m1,
      count(DISTINCT p.user_id) FILTER (WHERE p.purchased_at>=c.cohort+interval '3 months')::int retained_m3,
      count(DISTINCT p.user_id) FILTER (WHERE p.purchased_at>=c.cohort+interval '6 months')::int retained_m6
    FROM cohorts c
    LEFT JOIN brand_purchases p ON p.user_id=c.user_id
    GROUP BY c.cohort ORDER BY c.cohort DESC LIMIT 18`);

    const migrationQ=await this.pool.query(`WITH ordered AS (
      SELECT p.user_id,p.brand_id,b.name brand_name,p.purchased_at,
        lag(p.brand_id) OVER(PARTITION BY p.user_id ORDER BY p.purchased_at) prev_brand_id,
        lag(b.name) OVER(PARTITION BY p.user_id ORDER BY p.purchased_at) prev_brand_name
      FROM brand_purchases p JOIN brands b ON b.id=p.brand_id WHERE p.user_id IS NOT NULL
    )
    SELECT prev_brand_name from_brand,brand_name to_brand,count(*)::int transitions,
      count(DISTINCT user_id)::int users
    FROM ordered WHERE prev_brand_id IS NOT NULL AND prev_brand_id<>brand_id
    GROUP BY prev_brand_name,brand_name ORDER BY transitions DESC LIMIT 30`);

    const crossBrandQ=await this.pool.query(`WITH u AS (
      SELECT user_id,count(DISTINCT brand_id)::int brands FROM brand_purchases WHERE user_id IS NOT NULL GROUP BY user_id
    ) SELECT count(*)::int buyers,count(*) FILTER (WHERE brands>1)::int multi_brand_buyers,
      COALESCE(avg(brands),0)::numeric(10,2) avg_brands_per_buyer FROM u`);

    const crossEventQ=await this.pool.query(`WITH regs AS (
      SELECT er.user_id,
        CASE
          WHEN lower(COALESCE(e.metadata->>'eventCode',e.metadata->>'event_code',e.external_key,e.title,'')) LIKE '%bfs%'
            OR lower(COALESCE(e.metadata->>'eventCode',e.metadata->>'event_code',e.external_key,e.title,'')) LIKE '%brics%' THEN 'bfs'
          ELSE 'mfw'
        END event_brand
      FROM event_registrations er JOIN events e ON e.id=er.event_id
      WHERE er.status NOT IN ('cancelled','no_show')
    ), per_user AS (
      SELECT user_id,bool_or(event_brand='mfw') mfw,bool_or(event_brand='bfs') bfs FROM regs GROUP BY user_id
    )
    SELECT count(*)::int registered_users,
      count(*) FILTER(WHERE mfw)::int mfw_users,
      count(*) FILTER(WHERE bfs)::int bfs_users,
      count(*) FILTER(WHERE mfw AND bfs)::int cross_event_users
    FROM per_user`);

    const acquisitionQ=await this.pool.query(`SELECT source,count(DISTINCT user_id)::int acquired,
      COALESCE(sum(cost_amount),0) cost,
      count(DISTINCT p.user_id)::int buyers,COALESCE(sum(p.amount),0) revenue
    FROM brand_acquisition_events a
    LEFT JOIN brand_purchases p ON p.user_id=a.user_id AND p.brand_id=a.brand_id AND p.purchased_at>=a.acquired_at
    GROUP BY source ORDER BY acquired DESC,revenue DESC`);

    const brands=brandsQ.rows.map(x=>({
      id:String(x.external_key||x.id),name:x.name,customers:Number(x.customers||0),orders:Number(x.orders||0),
      attributableGmv:Number(x.attributable_gmv||0),incrementalGmv:Number(x.incremental_gmv||0),
      retainedCustomers:Number(x.retained_customers||0),predictedClv:Number(x.predicted_clv||0),
      aov:Number(x.aov||0),campaignCost:Number(x.campaign_cost||0)
    }));
    const summary={
      brands:brands.length,
      customers:brands.reduce((s,x)=>s+x.customers,0),
      retainedCustomers:brands.reduce((s,x)=>s+x.retainedCustomers,0),
      attributableGmv:brands.reduce((s,x)=>s+x.attributableGmv,0),
      incrementalGmv:brands.reduce((s,x)=>s+x.incrementalGmv,0),
      predictedClv:brands.reduce((s,x)=>s+x.predictedClv,0),
      campaignCost:brands.reduce((s,x)=>s+x.campaignCost,0)
    };
    summary.ecosystemRetention=summary.customers?summary.retainedCustomers/summary.customers:0;
    const cb=crossBrandQ.rows[0]||{},ce=crossEventQ.rows[0]||{};
    const crossEvent={registeredUsers:Number(ce.registered_users||0),mfwUsers:Number(ce.mfw_users||0),bfsUsers:Number(ce.bfs_users||0),crossEventUsers:Number(ce.cross_event_users||0)};
    crossEvent.overlapRate=crossEvent.registeredUsers?crossEvent.crossEventUsers/crossEvent.registeredUsers:0;
    const crossBrand={buyers:Number(cb.buyers||0),multiBrandBuyers:Number(cb.multi_brand_buyers||0),avgBrandsPerBuyer:Number(cb.avg_brands_per_buyer||0)};
    crossBrand.migrationRate=crossBrand.buyers?crossBrand.multiBrandBuyers/crossBrand.buyers:0;
    const acquisitionMix=acquisitionQ.rows.map(x=>({source:x.source,acquired:Number(x.acquired||0),cost:Number(x.cost||0),buyers:Number(x.buyers||0),revenue:Number(x.revenue||0),cac:Number(x.acquired||0)?Number(x.cost||0)/Number(x.acquired||0):null,roi:Number(x.cost||0)?(Number(x.revenue||0)-Number(x.cost||0))/Number(x.cost||0):null}));
    const scenarios=[
      {id:'conservative',label:'Conservative',retentionUplift:0.00,gmvUplift:0.00,clvRealization:Math.max(0,clvRealization-0.20)},
      {id:'base',label:'Base',retentionUplift:0.10,gmvUplift:0.15,clvRealization:clvRealization},
      {id:'upside',label:'Upside',retentionUplift:0.20,gmvUplift:0.30,clvRealization:Math.min(1,clvRealization+0.20)}
    ].map(s=>({
      ...s,
      illustrativeValue:
        summary.incrementalGmv*(1+s.gmvUplift)*retentionRate +
        summary.predictedClv*s.clvRealization*(1+s.retentionUplift)
    }));
    return {
      summary,brands,
      cohorts:cohortQ.rows.map(x=>({cohort:x.cohort,customers:Number(x.customers||0),m1:Number(x.retained_m1||0),m3:Number(x.retained_m3||0),m6:Number(x.retained_m6||0)})),
      migration:migrationQ.rows.map(x=>({from:x.from_brand,to:x.to_brand,transitions:Number(x.transitions||0),users:Number(x.users||0)})),
      crossBrand,crossEvent,acquisitionMix,scenarios,
      scenarioAssumptions:{retentionContributionRate:retentionRate,clvRealizationRate:clvRealization,note:'Illustrative product-value scenario; not enterprise valuation.'},
      dataMode:'postgres'
    };
  }

  async customerEconomics(brandRef){
    if(!this.pool){
      const rows=(this.memory.brandPurchases||[]).filter(x=>x.brandId===String(brandRef)),by=new Map();
      rows.forEach(x=>{const k=String(x.userId||'anonymous'),a=by.get(k)||[];a.push(x);by.set(k,a)});
      const customers=[...by.entries()].map(([userId,a])=>({userId,orders:a.length,revenue:a.reduce((s,x)=>s+Number(x.amount||0),0),repeat:a.length>1}));
      const revenue=customers.reduce((s,x)=>s+x.revenue,0),orders=rows.length;
      return {customers:customers.length,orders,revenue,aov:orders?revenue/orders:0,repeatCustomers:customers.filter(x=>x.repeat).length,repeatRate:customers.length?customers.filter(x=>x.repeat).length/customers.length:0,ltv:customers.length?revenue/customers.length:0,cohorts:[],dataMode:'memory'};
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return {customers:0,orders:0,revenue:0,aov:0,repeatCustomers:0,repeatRate:0,ltv:0,cohorts:[],dataMode:'postgres'};
    const r=await this.pool.query(`WITH per_user AS (
      SELECT user_id,count(*) orders,sum(amount) revenue,min(purchased_at) first_purchase,max(purchased_at) last_purchase
      FROM brand_purchases WHERE brand_id=$1 AND user_id IS NOT NULL GROUP BY user_id
    ) SELECT count(*)::int customers,COALESCE(sum(orders),0)::int orders,COALESCE(sum(revenue),0) revenue,
      count(*) FILTER (WHERE orders>1)::int repeat_customers FROM per_user`,[brand.storageId]);
    const x=r.rows[0],customers=Number(x.customers||0),orders=Number(x.orders||0),revenue=Number(x.revenue||0),repeat=Number(x.repeat_customers||0);
    const q=await this.pool.query(`WITH firsts AS (
      SELECT user_id,date_trunc('month',min(purchased_at)) cohort FROM brand_purchases WHERE brand_id=$1 AND user_id IS NOT NULL GROUP BY user_id
    ) SELECT to_char(f.cohort,'YYYY-MM') cohort,count(DISTINCT f.user_id)::int customers,
      count(DISTINCT p.user_id) FILTER (WHERE p.purchased_at>=f.cohort+interval '1 month')::int retained_30d,
      count(DISTINCT p.user_id) FILTER (WHERE p.purchased_at>=f.cohort+interval '3 months')::int retained_90d
      FROM firsts f LEFT JOIN brand_purchases p ON p.brand_id=$1 AND p.user_id=f.user_id GROUP BY f.cohort ORDER BY f.cohort DESC LIMIT 12`,[brand.storageId]);
    return {customers,orders,revenue,aov:orders?revenue/orders:0,repeatCustomers:repeat,repeatRate:customers?repeat/customers:0,ltv:customers?revenue/customers:0,cohorts:q.rows,dataMode:'postgres'};
  }

  async createBrandCampaign(brandRef,input,createdBy){
    const segment=input.segment||{kind:'all_followers'};
    if(!this.pool){
      if(!this.memory.brandCampaigns)this.memory.brandCampaigns=new Map();
      const id='bc_'+require('crypto').randomBytes(6).toString('hex');
      const item={id,brandId:String(brandRef),name:String(input.name||'Campaign'),campaignType:String(input.campaignType||'invitation'),segment,channel:String(input.channel||'push'),messageRu:String(input.messageRu||''),messageEn:String(input.messageEn||''),status:'draft',createdBy:String(createdBy||''),createdAt:new Date().toISOString(),demo:true};
      this.memory.brandCampaigns.set(id,item);return item;
    }
    const brand=await this.brandByRef(brandRef);if(!brand)throw new Error('brand_not_found');
    const r=await this.pool.query(`INSERT INTO brand_campaigns(brand_id,external_key,name,campaign_type,segment,channel,message_ru,message_en,created_by,status,scheduled_at,frequency_cap,require_marketing_consent,saved_segment_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[brand.storageId,'bc_'+require('crypto').randomBytes(8).toString('hex'),String(input.name||'Campaign'),String(input.campaignType||'invitation'),segment,String(input.channel||'push'),String(input.messageRu||''),String(input.messageEn||''),createdBy||null,input.scheduledAt?'scheduled':'draft',input.scheduledAt||null,input.frequencyCap||{per_user_per_7d:2},input.requireMarketingConsent!==false,input.savedSegmentId||null]);
    if(input.controlPct!=null||input.costAmount!=null)await this.pool.query('UPDATE brand_campaigns SET control_pct=$2,cost_amount=$3,cost_currency=$4 WHERE id=$1',[r.rows[0].id,Math.max(0,Math.min(50,Number(input.controlPct||0))),Math.max(0,Number(input.costAmount||0)),String(input.costCurrency||'RUB')]);
    return r.rows[0];
  }

  async campaignAnalytics(brandRef){
    if(!this.pool){
      const campaigns=[...(this.memory.brandCampaigns||new Map()).values()].filter(x=>x.brandId===String(brandRef));
      return {campaigns,funnel:{audience:0,sent:0,visits:0,claims:0,redeemed:0,purchases:0,revenue:0},currency:'RUB',dataMode:'memory'};
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return {campaigns:[],funnel:{},currency:'RUB',dataMode:'postgres'};
    const campaigns=await this.pool.query(`SELECT c.*,
      (SELECT count(*) FROM brand_campaign_audience a WHERE a.campaign_id=c.id)::int audience,
      (SELECT count(*) FROM brand_campaign_events e WHERE e.campaign_id=c.id AND e.event_type='sent')::int sent,
      (SELECT count(*) FROM brand_campaign_events e WHERE e.campaign_id=c.id AND e.event_type='visit')::int visits,
      (SELECT count(*) FROM brand_campaign_events e WHERE e.campaign_id=c.id AND e.event_type='redeemed')::int redeemed,
      (SELECT count(*) FROM brand_purchases p WHERE p.campaign_id=c.id)::int purchases,
      (SELECT COALESCE(sum(p.amount),0) FROM brand_purchases p WHERE p.campaign_id=c.id) revenue
      FROM brand_campaigns c WHERE c.brand_id=$1 ORDER BY c.created_at DESC`,[brand.storageId]);
    const f=await this.pool.query(`SELECT
      (SELECT count(*) FROM brand_campaign_audience a JOIN brand_campaigns c ON c.id=a.campaign_id WHERE c.brand_id=$1)::int audience,
      (SELECT count(*) FROM brand_campaign_events e JOIN brand_campaigns c ON c.id=e.campaign_id WHERE c.brand_id=$1 AND e.event_type='sent')::int sent,
      (SELECT count(*) FROM brand_campaign_events e JOIN brand_campaigns c ON c.id=e.campaign_id WHERE c.brand_id=$1 AND e.event_type='visit')::int visits,
      (SELECT count(*) FROM brand_campaign_events e JOIN brand_campaigns c ON c.id=e.campaign_id WHERE c.brand_id=$1 AND e.event_type='claim')::int claims,
      (SELECT count(*) FROM brand_campaign_events e JOIN brand_campaigns c ON c.id=e.campaign_id WHERE c.brand_id=$1 AND e.event_type='redeemed')::int redeemed,
      (SELECT count(*) FROM brand_purchases p WHERE p.brand_id=$1)::int purchases,
      (SELECT COALESCE(sum(amount),0) FROM brand_purchases WHERE brand_id=$1) revenue`,[brand.storageId]);
    const x=f.rows[0];return {campaigns:campaigns.rows,funnel:{audience:Number(x.audience||0),sent:Number(x.sent||0),visits:Number(x.visits||0),claims:Number(x.claims||0),redeemed:Number(x.redeemed||0),purchases:Number(x.purchases||0),revenue:Number(x.revenue||0)},currency:'RUB',dataMode:'postgres'};
  }

  async claimsForBrand(brandRef){
    if(!this.pool){
      const offerIds=new Set(this.memory.loyaltyOffers.filter(x=>x.brandId===String(brandRef)).map(x=>x.id));
      return [...this.memory.loyaltyClaims.values()].filter(x=>offerIds.has(x.offerId));
    }
    const brand=await this.brandByRef(brandRef);if(!brand)return [];
    const r=await this.pool.query(`SELECT c.*,o.external_key offer_external_key,o.reward_type,o.reward_value
      FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id
      WHERE o.brand_id=$1 ORDER BY c.issued_at DESC`,[brand.storageId]);
    return r.rows.map(x=>({id:String(x.id),userId:String(x.user_id),offerId:x.offer_external_key||String(x.offer_id),status:x.status,issuedAt:x.issued_at,expiresAt:x.expires_at,redeemedAt:x.redeemed_at,rewardType:x.reward_type,rewardValue:x.reward_value==null?null:Number(x.reward_value)}));
  }

  async moderatePost(postRef,status,note){
    if(!this.pool){
      const p=this.memory.brandPosts.find(x=>x.id===String(postRef));if(!p)return null;
      p.status=status||p.status;if(p.status==='published'&&!p.publishedAt)p.publishedAt=new Date().toISOString();
      p.moderationNote=String(note||p.moderationNote||'');return p;
    }
    const r=await this.pool.query(`UPDATE brand_content_posts SET
      status=COALESCE($2,status),
      moderation_note=COALESCE(NULLIF($3,''),moderation_note),
      published_at=CASE WHEN COALESCE($2,status)='published' THEN COALESCE(published_at,now()) ELSE published_at END,
      updated_at=now()
      WHERE external_key=$1 OR id::text=$1
      RETURNING *`,[String(postRef),status||null,String(note||'')]);
    if(!r.rowCount)return null;
    const b=await this.pool.query('SELECT external_key,slug FROM brands WHERE id=$1',[r.rows[0].brand_id]);
    return camelPost({...r.rows[0],brand_external_key:b.rows[0]&&b.rows[0].external_key,brand_slug:b.rows[0]&&b.rows[0].slug});
  }

  async moderateOffer(offerRef,status){
    if(!this.pool){
      const o=this.memory.loyaltyOffers.find(x=>x.id===String(offerRef));if(!o)return null;o.status=status||o.status;return o;
    }
    const r=await this.pool.query(`UPDATE loyalty_offers SET status=COALESCE($2,status),updated_at=now()
      WHERE external_key=$1 OR id::text=$1 RETURNING external_key,id`,[String(offerRef),status||null]);
    if(!r.rowCount)return null;
    return this.offerByRef(r.rows[0].external_key||String(r.rows[0].id));
  }

  async brandPushCount(brandRef,days=7){
    if(!this.pool){
      const cutoff=Date.now()-Number(days)*86400000;
      return this.memory.notifications.filter(n=>n.category==='brand_news'&&n.brandId===String(brandRef)&&['scheduled','sent'].includes(n.status)&&new Date(n.createdAt||n.sentAt||0).getTime()>=cutoff).length;
    }
    const r=await this.pool.query(`SELECT count(*)::int n FROM notifications
      WHERE category='brand_news'
        AND COALESCE(payload->>'brandRef','')=$1
        AND status IN ('scheduled','sending','sent')
        AND created_at>=now()-($2::text||' days')::interval`,[String(brandRef),String(Number(days))]);
    return Number(r.rows[0].n||0);
  }

  async createBrandPush(brandRef,postRef){
    if(!this.pool)return null;
    const brand=await this.brandByRef(brandRef);if(!brand)return null;
    const p=await this.pool.query(`SELECT * FROM brand_content_posts
      WHERE brand_id=$1 AND (external_key=$2 OR id::text=$2) LIMIT 1`,[brand.storageId,String(postRef)]);
    if(!p.rowCount)return {error:'post_not_found'};
    const post=camelPost({...p.rows[0],brand_external_key:brand.id,brand_slug:brand.slug});
    if(post.status!=='published')return {error:'post_not_published'};
    if(post.isPaid||(post.audienceScope&&post.audienceScope.kind)!=='brand_followers')return {error:'mfw_wide_push_requires_organizer'};
    const count=await this.brandPushCount(brandRef,7);
    if(count>=2)return {error:'brand_push_frequency_cap',limit:2,windowDays:7};
    const r=await this.pool.query(`INSERT INTO notifications(audience,category,title,body,payload,status,scheduled_at)
      VALUES($1,'brand_news',$2,$3,$4,'scheduled',now()) RETURNING *`,[
        {kind:'brand_followers',brandRef:String(brandRef)},post.titleRu,post.bodyRu||'',
        {brandRef:String(brandRef),postRef:String(postRef)}
      ]);
    const x=r.rows[0];
    return {data:{id:String(x.id),category:x.category,brandId:String(brandRef),postId:String(postRef),audience:x.audience,title:x.title,body:x.body,status:x.status,createdAt:x.created_at,scheduledAt:x.scheduled_at},policy:{frequencyCap:'2_per_brand_per_7d',audience:'brand_followers_only'}};
  }

  async notificationsForUser(userId){
    if(!this.pool)return null;
    const pref=await this.preferences(userId);
    const followed=await this.brandFollowRefs(userId);
    const r=await this.pool.query(`SELECT * FROM notifications
      WHERE status IN ('scheduled','sending','sent')
      ORDER BY COALESCE(sent_at,scheduled_at,created_at) DESC LIMIT 60`);
    const data=[];
    for(const n of r.rows){
      const payload=n.payload||{},aud=n.audience||{};
      const brandRef=payload.brandRef||aud.brandRef||null;
      let include=false;
      if(n.category==='critical')include=!!pref.criticalEnabled;
      else if(n.category==='live')include=!!pref.liveEnabled;
      else if(n.category==='brand_news')include=!!pref.followedBrandNewsEnabled&&brandRef&&followed.has(String(brandRef));
      else if(n.category==='loyalty')include=!!pref.loyaltyEnabled;
      else if(n.category==='brand_event')include=!!pref.brandEventsEnabled&&brandRef&&followed.has(String(brandRef));
      else if(n.category==='brand_campaign')include=!!pref.paidPromotionsEnabled;
      if(include)data.push({id:String(n.id),category:n.category,title:n.title,body:n.body,status:n.status,brandId:brandRef,postId:payload.postRef||null,createdAt:n.created_at,scheduledAt:n.scheduled_at,sentAt:n.sent_at});
      if(data.length>=30)break;
    }
    return {data,preferences:pref};
  }

  async brandGrowth(){
    if(!this.pool)return null;
    const brandsR=await this.pool.query(`SELECT b.id,b.external_key,b.slug,b.name,
      (SELECT count(*) FROM brand_follows f WHERE f.brand_id=b.id)::int followers,
      (SELECT count(*) FROM brand_content_posts p WHERE p.brand_id=b.id AND p.status='published')::int published_posts,
      (SELECT count(*) FROM loyalty_offers o WHERE o.brand_id=b.id AND o.status='published')::int active_offers,
      (SELECT count(*) FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id WHERE o.brand_id=b.id)::int issued_claims
      FROM brands b WHERE b.status='published' ORDER BY b.name`);
    const channelsR=await this.pool.query(`SELECT c.*,b.external_key brand_external_key,b.slug brand_slug
      FROM brand_social_channels c LEFT JOIN brands b ON b.id=c.brand_id ORDER BY c.owner_type,c.platform`);
    const membersR=await this.pool.query(`SELECT count(*)::int total,
      count(*) FILTER(WHERE status='active')::int active FROM social_memberships`);
    const offers=[];
    for(const b of brandsR.rows){
      const ref=b.external_key||b.slug||String(b.id);
      offers.push(...await this.offersForBrand(ref));
    }
    const postsR=await this.pool.query(`SELECT p.*,b.external_key brand_external_key,b.slug brand_slug
      FROM brand_content_posts p JOIN brands b ON b.id=p.brand_id ORDER BY COALESCE(p.published_at,p.created_at) DESC LIMIT 100`);
    return {
      brands:brandsR.rows.map(x=>({id:x.external_key||x.slug||String(x.id),name:x.name,followers:Number(x.followers||0),publishedPosts:Number(x.published_posts||0),activeOffers:Number(x.active_offers||0),issuedClaims:Number(x.issued_claims||0)})),
      social:{channels:channelsR.rows.map(camelChannel),membershipsVerified:Number(membersR.rows[0].total||0),activeMemberships:Number(membersR.rows[0].active||0)},
      offers,
      content:{posts:postsR.rows.map(camelPost),recentInteractions:[]}
    };
  }

  async retentionMetrics(){
    if(!this.pool)return null;
    const feed=await this.pool.query(`SELECT
      count(*)::int impressions,
      count(*) FILTER(WHERE p.is_paid=false)::int organic,
      count(*) FILTER(WHERE p.is_paid=true)::int paid
      FROM content_impressions i JOIN brand_content_posts p ON p.id=i.post_id`);
    const opens=await this.pool.query(`SELECT count(*)::int n FROM analytics_events WHERE event_name='brand_content_open'`);
    const push=await this.pool.query(`SELECT
      count(*) FILTER(WHERE status='scheduled')::int scheduled,
      count(*) FILTER(WHERE status='sent')::int sent,
      count(*) FILTER(WHERE category='brand_news' AND created_at>=now()-interval '7 days')::int brand7
      FROM notifications`);
    const impressions=Number(feed.rows[0].impressions||0),openN=Number(opens.rows[0].n||0);
    return {
      feed:{impressions,organicImpressions:Number(feed.rows[0].organic||0),paidImpressions:Number(feed.rows[0].paid||0),opens:openN,openRatePct:impressions?Math.round(openN/impressions*1000)/10:0},
      push:{scheduled:Number(push.rows[0].scheduled||0),sent:Number(push.rows[0].sent||0),brandNewsLast7d:Number(push.rows[0].brand7||0)},
      policy:{organicPriority:true,paidLabelRequired:true,paidFeedFrequencyCap:'2_per_post_per_7d',paidFeedSpacing:'max_1_per_4_slots',brandPushFrequencyCap:'2_per_brand_per_7d',paidPushByBrand:false}
    };
  }

  async seedDemo(){
    if(!this.pool)return;
    for(const b of this.memory.brands){
      await this.pool.query(`UPDATE brands SET external_key=$2,description=COALESCE(description,$3),metadata=metadata||$4::jsonb
        WHERE slug=$1`,[b.slug,b.id,b.description||null,JSON.stringify({segment:b.segment,demo:true})]);
    }
    for(const c of this.memory.socialChannels){
      const brand=c.brandId?await this.brandByRef(c.brandId):null;
      await this.pool.query(`INSERT INTO brand_social_channels(
        brand_id,owner_type,platform,external_channel_id,handle,url,verification_mode,status,external_key,verified_at,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT(platform,external_channel_id) DO UPDATE SET
          brand_id=EXCLUDED.brand_id,owner_type=EXCLUDED.owner_type,handle=EXCLUDED.handle,url=EXCLUDED.url,
          verification_mode=EXCLUDED.verification_mode,status=EXCLUDED.status,external_key=EXCLUDED.external_key
        `,[brand&&brand.storageId||null,c.ownerType,c.platform,c.externalChannelId,c.handle||null,c.url||null,c.verificationMode,c.status,c.id,c.verifiedAt||null,JSON.stringify({demo:true})]);
    }
    for(const o of this.memory.loyaltyOffers){
      const brand=await this.brandByRef(o.brandId);if(!brand)continue;
      const r=await this.pool.query(`INSERT INTO loyalty_offers(
        brand_id,external_key,title_ru,title_en,description_ru,description_en,reward_type,reward_value,min_continuous_days,stock_limit,per_user_limit,status,terms_ru,terms_en,audience_scope)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT(external_key) DO UPDATE SET
          title_ru=EXCLUDED.title_ru,title_en=EXCLUDED.title_en,description_ru=EXCLUDED.description_ru,description_en=EXCLUDED.description_en,
          reward_type=EXCLUDED.reward_type,reward_value=EXCLUDED.reward_value,min_continuous_days=EXCLUDED.min_continuous_days,
          stock_limit=EXCLUDED.stock_limit,per_user_limit=EXCLUDED.per_user_limit,status=EXCLUDED.status,terms_ru=EXCLUDED.terms_ru,terms_en=EXCLUDED.terms_en
        RETURNING id`,[brand.storageId,o.id,o.titleRu,o.titleEn,o.descriptionRu||null,o.descriptionEn||null,o.rewardType,o.rewardValue,o.minContinuousDays,o.stockLimit,o.perUserLimit,o.status,o.termsRu||null,o.termsEn||null,o.audienceScope||{kind:'all_mfw'}]);
      await this.pool.query('DELETE FROM loyalty_offer_requirements WHERE offer_id=$1',[r.rows[0].id]);
      let order=10;
      for(const req of o.requirements||[]){
        const ch=req.channelId?await this.channelByRef(req.channelId):null;
        await this.pool.query(`INSERT INTO loyalty_offer_requirements(offer_id,requirement_type,channel_id,min_continuous_days,required,sort_order,metadata)
          VALUES($1,$2,$3,$4,$5,$6,$7)`,[r.rows[0].id,req.type,ch&&ch.storageId||null,req.minContinuousDays||0,req.required!==false,order,req.metadata||{}]);
        order+=10;
      }
    }
    for(const p of this.memory.brandPosts){
      const brand=await this.brandByRef(p.brandId);if(!brand)continue;
      await this.pool.query(`INSERT INTO brand_content_posts(
        brand_id,external_key,kind,title_ru,title_en,body_ru,body_en,image_url,cta_label_ru,cta_label_en,cta_url,event_starts_at,event_ends_at,
        audience_scope,placement_scope,is_paid,sponsor_label_ru,sponsor_label_en,frequency_cap,status,moderation_note,published_at,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,COALESCE($23,now()))
        ON CONFLICT(external_key) DO UPDATE SET
          title_ru=EXCLUDED.title_ru,title_en=EXCLUDED.title_en,body_ru=EXCLUDED.body_ru,body_en=EXCLUDED.body_en,image_url=EXCLUDED.image_url,
          audience_scope=EXCLUDED.audience_scope,placement_scope=EXCLUDED.placement_scope,is_paid=EXCLUDED.is_paid,status=EXCLUDED.status,published_at=EXCLUDED.published_at
        `,[brand.storageId,p.id,p.kind,p.titleRu,p.titleEn,p.bodyRu||null,p.bodyEn||null,p.imageUrl||null,p.ctaLabelRu||null,p.ctaLabelEn||null,p.ctaUrl||null,p.eventStartsAt||null,p.eventEndsAt||null,p.audienceScope||{kind:'brand_followers'},p.placementScope||['brand_profile','discover_feed'],!!p.isPaid,p.sponsorLabelRu||null,p.sponsorLabelEn||null,p.frequencyCap||{per_user_per_7d:2},p.status,p.moderationNote||null,p.publishedAt||null,p.createdAt||null]);
    }
  }
}

module.exports={Brand365Store};
