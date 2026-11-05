"""Generate the single P2 schema from explicit type definitions."""
from pathlib import Path
import json
O=Path(__file__).resolve().parent
def obj(properties,required=None):return {'type':'object','properties':properties,'required':list(properties) if required is None else required,'additionalProperties':False}
text={'type':'string','minLength':1}
identifier={'type':'string','pattern':'^[a-z][a-z0-9-]*$'}
path={'type':'string','pattern':r'^(?!/)(?![A-Za-z]:)(?!.*(?:^|/)\.\.(?:/|$))[^\\]+$','minLength':1}
source_refs={'type':'array','items':identifier,'minItems':1,'uniqueItems':True}
scalar_types=['dimension','angle','number','integer','opacity','color','font-family','font-weight','boolean','string']
defs={}
def value(kind,props):
    return obj({'type':{'const':kind},**props,'sourceRefs':source_refs},['type',*props])
variants=[value('dimension',{'value':{'type':'number'},'unit':{'enum':['px','rem','em','%']}}),
    value('angle',{'value':{'type':'number'},'unit':{'const':'deg'}}),
    value('number',{'value':{'type':'number'}}),value('integer',{'value':{'type':'integer'}}),
    value('opacity',{'value':{'type':'number','minimum':0,'maximum':1}}),
    value('font-family',{'value':text}),value('font-weight',{'value':{'type':'integer','minimum':1,'maximum':1000}}),
    value('boolean',{'value':{'type':'boolean'}}),value('string',{'value':text}),
    value('color',{'format':{'const':'hex'},'value':{'type':'string','pattern':'^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$'}}),
    value('color',{'format':{'const':'srgb'},'value':obj({k:{'type':'number','minimum':0,'maximum':1} for k in ['r','g','b','a']},['r','g','b'])}),
    value('token',{'ref':identifier,'expectedType':{'enum':scalar_types}})]
defs['value']={'oneOf':variants}
defs['parameters']={'type':'object','minProperties':1,'propertyNames':identifier,'additionalProperties':{'$ref':'#/definitions/value'}}
defs['layer']=obj({'sourceRefs':source_refs,'parameters':{'$ref':'#/definitions/parameters'}})
defs['state']=defs['layer']
defs['variant']=obj({'description':text,'sourceRefs':source_refs,'parameters':{'$ref':'#/definitions/parameters'},
    'states':{'type':'object','minProperties':1,'propertyNames':identifier,'additionalProperties':{'$ref':'#/definitions/state'}}},['description','sourceRefs'])
local_source=obj({'kind':{'enum':['document','asset','design-system']},'uri':path,
    'status':{'enum':['approved-decision','observed-snapshot','reference-only']},'snapshot':text})
figma_source=obj({'kind':{'const':'figma'},'uri':{'type':'string','pattern':r'^https://(www\.)?figma\.com/(design|file)/[^\s]+$'},
    'nodeId':text,'status':{'enum':['observed-snapshot','unverified-live','reference-only']},'snapshot':text})
schema={'$schema':'http://json-schema.org/draft-07/schema#','$id':'urn:catalog:component-parameters:v1',
    'title':'Typed parameters of a documented component; not product behavior or API schema',
    **obj({'schemaVersion':{'const':1},'component':obj({'id':identifier,'title':text,'contract':path,
            'status':{'enum':['approved-target','observed-source','example-only']}}),
        'sources':{'type':'object','minProperties':1,'propertyNames':identifier,'additionalProperties':{'oneOf':[local_source,figma_source]}},
        'tokens':{'type':'object','minProperties':1,'propertyNames':identifier,'additionalProperties':obj({'type':{'enum':scalar_types},'sourceRef':identifier,'locator':text})},
        'base':{'$ref':'#/definitions/layer'},
        'variants':{'type':'object','minProperties':1,'propertyNames':identifier,'additionalProperties':{'$ref':'#/definitions/variant'}},
        'dependencies':{'type':'array','items':obj({'id':identifier,'document':path,'role':{'enum':['child-contract','design-source','external-owner']}})}},
        ['schemaVersion','component','sources','base','variants']), 'definitions':defs}
(O/'schemas').mkdir(exist_ok=True)
(O/'schemas/component-parameters.schema.json').write_text(json.dumps(schema,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Schema generated.')
