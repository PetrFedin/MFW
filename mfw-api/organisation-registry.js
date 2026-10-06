const crypto=require('crypto');

const TYPES=new Set(['brand','buyer','media','institution','service_provider','education','government','other']);
const RELATIONSHIP_ROLES=new Set(['owner','representative','buyer','speaker','delegate','media','staff','service_provider']);

function normalizeOrganisationName(value){
  return String(value||'').trim().replace(/\s+/g,' ').toLowerCase();
}

function validateClaim(input){
  const canonicalName=String(input&&input.name||'').trim().replace(/\s+/g,' ');
  if(canonicalName.length<2||canonicalName.length>200)throw new Error('organisation_name_invalid');
  const organisationType=String(input&&input.organisationType||'brand').toLowerCase();
  if(!TYPES.has(organisationType))throw new Error('organisation_type_invalid');
  const relationshipRole=String(input&&input.relationshipRole||'representative').toLowerCase();
  if(!RELATIONSHIP_ROLES.has(relationshipRole))throw new Error('organisation_relationship_role_invalid');
  const countryCode=input&&input.countryCode?String(input.countryCode).trim().toUpperCase():null;
  if(countryCode&&!/^[A-Z]{2}$/.test(countryCode))throw new Error('organisation_country_invalid');
  const city=input&&input.city?String(input.city).trim().slice(0,160):null;
  const website=input&&input.website?String(input.website).trim().slice(0,500):null;
  if(website&&!/^https:\/\//i.test(website))throw new Error('organisation_website_invalid');
  return {canonicalName,normalizedName:normalizeOrganisationName(canonicalName),organisationType,relationshipRole,countryCode,city,website,roleTitle:String(input&&input.roleTitle||'').trim().slice(0,160)||null};
}

class OrganisationRegistry{
  constructor({pool=null,memory=null}={}){
    this.pool=pool;
    this.memory=memory||new Map();
  }

  async claimForUser(userId,input){
    const clean=validateClaim(input);
    if(this.pool){
      const client=await this.pool.connect();
      try{
        await client.query('BEGIN');
        const org=await client.query(`INSERT INTO professional_organisations(
          canonical_name,normalized_name,organisation_type,country_code,city,website,metadata)
          VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)
          ON CONFLICT(normalized_name) DO UPDATE SET
            canonical_name=professional_organisations.canonical_name,
            updated_at=now()
          RETURNING id,canonical_name AS "name",normalized_name AS "normalizedName",
            organisation_type AS "organisationType",country_code AS "countryCode",city,website,status,
            verification_status AS "verificationStatus",verification_source AS "verificationSource",
            verified_at AS "verifiedAt",created_at AS "createdAt",updated_at AS "updatedAt"`,
          [clean.canonicalName,clean.normalizedName,clean.organisationType,clean.countryCode,clean.city,clean.website,JSON.stringify({claimSource:'self_claim'})]);
        const row=org.rows[0];
        await client.query(`INSERT INTO professional_organisation_memberships(
          organisation_id,user_id,role_title,relationship_role,status,source)
          VALUES($1,$2,$3,$4,'active','self_claim')
          ON CONFLICT(organisation_id,user_id) DO UPDATE SET
            role_title=EXCLUDED.role_title,relationship_role=EXCLUDED.relationship_role,status='active',ended_at=NULL,updated_at=now()`,
          [row.id,userId,clean.roleTitle,clean.relationshipRole]);
        await client.query('COMMIT');
        return {...row,relationship:{roleTitle:clean.roleTitle,relationshipRole:clean.relationshipRole,status:'active',source:'self_claim'}};
      }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
    }
    const existing=[...this.memory.values()].find(x=>x.normalizedName===clean.normalizedName);
    const row=existing||{
      id:'org_'+crypto.createHash('sha256').update(clean.normalizedName).digest('hex').slice(0,16),
      name:clean.canonicalName,normalizedName:clean.normalizedName,organisationType:clean.organisationType,
      countryCode:clean.countryCode,city:clean.city,website:clean.website,status:'active',
      verificationStatus:'unverified',verificationSource:null,verifiedAt:null,createdAt:new Date().toISOString(),members:new Map(),participation:[]
    };
    row.members.set(String(userId),{userId:String(userId),roleTitle:clean.roleTitle,relationshipRole:clean.relationshipRole,status:'active',source:'self_claim'});
    row.updatedAt=new Date().toISOString();
    this.memory.set(row.id,row);
    return this.publicRow(row,{forUserId:userId});
  }

  async list({limit=50,type=null,verifiedOnly=false}={}){
    limit=Math.max(1,Math.min(200,Number(limit)||50));
    if(type&&!TYPES.has(type))throw new Error('organisation_type_invalid');
    if(this.pool){
      const params=[];const where=["status='active'"];
      if(type){params.push(type);where.push(`organisation_type=$${params.length}`);}
      if(verifiedOnly){where.push("verification_status='verified'");}
      params.push(limit);
      const r=await this.pool.query(`SELECT id,canonical_name AS "name",organisation_type AS "organisationType",
        country_code AS "countryCode",city,website,status,verification_status AS "verificationStatus",
        verification_source AS "verificationSource",verified_at AS "verifiedAt",
        created_at AS "createdAt",updated_at AS "updatedAt",
        (SELECT count(*)::int FROM professional_organisation_memberships m WHERE m.organisation_id=o.id AND m.status='active') AS "activeRepresentativeCount",
        (SELECT count(*)::int FROM professional_organisation_participation p WHERE p.organisation_id=o.id AND p.status<>'revoked') AS "participationCount"
        FROM professional_organisations o WHERE ${where.join(' AND ')}
        ORDER BY (verification_status='verified') DESC,canonical_name LIMIT $${params.length}`,params);
      return r.rows;
    }
    return [...this.memory.values()].filter(x=>x.status==='active'&&(!type||x.organisationType===type)&&(!verifiedOnly||x.verificationStatus==='verified'))
      .sort((a,b)=>(b.verificationStatus==='verified')-(a.verificationStatus==='verified')||a.name.localeCompare(b.name))
      .slice(0,limit).map(x=>this.publicRow(x));
  }

  async summary(){
    if(this.pool){
      const r=await this.pool.query(`SELECT
        count(*) FILTER (WHERE status='active')::int AS "activeOrganisations",
        count(*) FILTER (WHERE status='active' AND verification_status='verified')::int AS "verifiedOrganisations",
        (SELECT count(*)::int FROM professional_organisation_memberships WHERE status='active') AS "activeRepresentatives",
        (SELECT count(*)::int FROM professional_organisation_participation WHERE status<>'revoked') AS "participationRecords",
        (SELECT count(DISTINCT organisation_id)::int FROM professional_organisation_participation WHERE status<>'revoked') AS "organisationsWithHistory",
        (SELECT count(DISTINCT organisation_id)::int FROM professional_organisation_participation WHERE status<>'revoked' AND event_brand='mfw') AS "mfwOrganisations",
        (SELECT count(DISTINCT organisation_id)::int FROM professional_organisation_participation WHERE status<>'revoked' AND event_brand='bfs') AS "bfsOrganisations",
        (SELECT count(DISTINCT organisation_id)::int FROM professional_organisation_participation WHERE status<>'revoked' AND event_brand='made_in_moscow') AS "madeOrganisations"
        FROM professional_organisations`);
      const row=r.rows[0]||{};
      const cross=await this.pool.query(`SELECT count(*)::int AS n FROM (
        SELECT organisation_id FROM professional_organisation_participation
        WHERE status<>'revoked' GROUP BY organisation_id
        HAVING count(DISTINCT event_brand)>=2
      ) x`);
      return {...row,crossEventOrganisations:cross.rows[0]?.n||0,authority:'persistent_organisation_registry'};
    }
    const rows=[...this.memory.values()].filter(x=>x.status==='active');
    const participation=rows.flatMap(x=>(x.participation||[]).filter(p=>p.status!=='revoked').map(p=>({...p,organisationId:x.id})));
    const byBrand=brand=>new Set(participation.filter(p=>p.eventBrand===brand).map(p=>p.organisationId)).size;
    const brandsByOrg=new Map();
    participation.forEach(p=>{const set=brandsByOrg.get(p.organisationId)||new Set();set.add(p.eventBrand);brandsByOrg.set(p.organisationId,set);});
    return {
      activeOrganisations:rows.length,
      verifiedOrganisations:rows.filter(x=>x.verificationStatus==='verified').length,
      activeRepresentatives:rows.reduce((n,x)=>n+(x.members?x.members.size:0),0),
      participationRecords:participation.length,
      organisationsWithHistory:new Set(participation.map(p=>p.organisationId)).size,
      mfwOrganisations:byBrand('mfw'),
      bfsOrganisations:byBrand('bfs'),
      madeOrganisations:byBrand('made_in_moscow'),
      crossEventOrganisations:[...brandsByOrg.values()].filter(set=>set.size>=2).length,
      authority:'persistent_organisation_registry',
    };
  }

  async get(id){
    if(this.pool){
      const r=await this.pool.query(`SELECT id,canonical_name AS "name",organisation_type AS "organisationType",
        country_code AS "countryCode",city,website,status,verification_status AS "verificationStatus",
        verification_source AS "verificationSource",verified_at AS "verifiedAt",
        created_at AS "createdAt",updated_at AS "updatedAt"
        FROM professional_organisations WHERE id::text=$1 AND status<>'archived'`,[String(id)]);
      if(!r.rowCount)return null;
      const participation=await this.pool.query(`SELECT event_brand AS "eventBrand",event_ref AS "eventRef",
        participation_type AS "participationType",status,source,evidence_ref AS "evidenceRef",occurred_at AS "occurredAt"
        FROM professional_organisation_participation WHERE organisation_id=$1 ORDER BY occurred_at DESC NULLS LAST,created_at DESC LIMIT 100`,[r.rows[0].id]);
      return {...r.rows[0],participation:participation.rows};
    }
    const row=this.memory.get(String(id));return row?this.publicRow(row):null;
  }

  publicRow(row,{forUserId=null}={}){
    const out={id:row.id,name:row.name,organisationType:row.organisationType,countryCode:row.countryCode||null,city:row.city||null,website:row.website||null,status:row.status,verificationStatus:row.verificationStatus,verificationSource:row.verificationSource||null,verifiedAt:row.verifiedAt||null,createdAt:row.createdAt,updatedAt:row.updatedAt||row.createdAt,activeRepresentativeCount:row.members?row.members.size:0,participationCount:row.participation?row.participation.length:0};
    if(forUserId&&row.members&&row.members.has(String(forUserId)))out.relationship=row.members.get(String(forUserId));
    return out;
  }
}

module.exports={OrganisationRegistry,normalizeOrganisationName,validateClaim};
